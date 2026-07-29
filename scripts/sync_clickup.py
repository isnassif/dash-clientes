#!/usr/bin/env python3
"""
Sincroniza o calendário de conteúdo (tabela `posts` do Supabase) com o
Space "N1 CLIENTES" do ClickUp.

REGRAS DE NEGÓCIO (definidas junto com o cliente do projeto):
  - Cada LISTA do ClickUp = um `client` no Supabase.
  - A pasta "CLIENTES - MODELO" / lista "MODELO" são um template e são ignoradas.
  - Só entram no calendário tarefas cujo status no ClickUp seja:
      "ap cliente"  -> aguardando aprovação do cliente  -> status "Pendente"
      "publicar"    -> pronta pra publicar (ainda não foi ao ar) -> status "Aprovado"
    Todo o resto (gravação, edição, design, onboarding, etc.) fica de fora —
    é produção interna, não aparece no calendário do cliente.
  - "Publicado" nunca é definido por esta sincronização: é setado manualmente
    dentro do app quando o post realmente vai ao ar no Instagram.
  - O tipo de conteúdo (Reels/Card/Carrossel/Story/Ads) é detectado a partir
    do NOME da tarefa (não existe campo dedicado no ClickUp para isso).
  - A data do post vem do campo personalizado "Postagem" (não do due_date).
  - O link do Drive vem do campo personalizado "Link Drive" (ou variações:
    "LINK DRIVE", "Link").
  - Tarefas sem tipo detectado OU sem data de "Postagem" preenchida são
    ignoradas (não são posts de calendário).

USO:
  # 1) Só mostra o que seria sincronizado, sem gravar nada (padrão, seguro)
  python3 scripts/sync_clickup.py

  # 2) Aplica de verdade no Supabase (cria/atualiza clients e posts)
  python3 scripts/sync_clickup.py --apply

  # 3) Usa um backup JSON local em vez de bater na API do ClickUp ao vivo
  python3 scripts/sync_clickup.py --json backup_clickup_n1_clientes.json --apply

CONFIGURAÇÃO NECESSÁRIA:
  - .env.local        -> NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
                          (já existe no projeto, usado pelo Next.js)
  - .env.clickup       -> CLICKUP_API_TOKEN, CLICKUP_SPACE_ID
                          (copie de .env.clickup.example e preencha)

Dependência externa: só usa `requests` (pip install requests).
"""

import argparse
import csv
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TZ_BR = timezone(timedelta(hours=-3))  # America/Bahia (sem horário de verão)

SKIP_FOLDERS = {"CLIENTES - MODELO"}
SKIP_LISTS = {"MODELO"}

STATUS_MAP = {
    "ap cliente": "Pendente",  # aguardando aprovação do cliente
    "publicar": "Aprovado",  # pronta pra publicar, ainda não foi ao ar
}
INCLUDE_CLICKUP_STATUSES = set(STATUS_MAP.keys())

TYPE_PATTERNS = [
    (re.compile(r"\bREELS?\b", re.I), "Reels"),
    (re.compile(r"\bCARROSSEL|CARROSEL\b", re.I), "Carrossel"),
    (re.compile(r"\bCARD\b|\bCAPAS?\b", re.I), "Card"),
    (re.compile(r"\bSTORY|STORIES\b", re.I), "Story"),
    (re.compile(r"\bTR[ÁA]FEGO\b|\bADS\b", re.I), "Ads"),
]

DRIVE_FIELD_NAMES = ("Link Drive", "LINK DRIVE", "Link")
DATE_FIELD_NAMES = ("Postagem",)


def generate_access_code(name):
    """Gera um código de acesso legível a partir do nome do cliente, ex: 'A FAVORITA' -> 'a-favorita-7f3a'."""
    import secrets
    import unicodedata

    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    suffix = secrets.token_hex(2)  # 4 caracteres hex, evita colisão
    return f"{slug}-{suffix}"


# ---------------------------------------------------------------------------
# .env loading (sem dependências externas)
# ---------------------------------------------------------------------------
def load_env_file(path: Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


def load_config():
    env = {}
    env.update(load_env_file(PROJECT_ROOT / ".env.local"))
    env.update(load_env_file(PROJECT_ROOT / ".env.clickup"))
    # variáveis de ambiente reais têm prioridade sobre os arquivos .env
    env.update({k: v for k, v in os.environ.items() if k in (
        "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
        "CLICKUP_API_TOKEN", "CLICKUP_SPACE_ID",
    )})

    missing = [
        k for k in (
            "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
        ) if not env.get(k)
    ]
    if missing:
        sys.exit(
            f"Faltando no .env.local: {', '.join(missing)}. "
            "Confira o arquivo na raiz do projeto."
        )
    return env


# ---------------------------------------------------------------------------
# ClickUp: extração (API ao vivo)
# ---------------------------------------------------------------------------
def clickup_get(url, token):
    resp = requests.get(url, headers={"Authorization": token, "Content-Type": "application/json"})
    resp.raise_for_status()
    return resp.json()


def fetch_from_clickup_api(token, space_id):
    base = "https://api.clickup.com/api/v2"
    print("Buscando pastas no ClickUp...")
    folders = clickup_get(f"{base}/space/{space_id}/folder", token).get("folders", [])

    pastas = []
    for folder in folders:
        print(f"  Pasta: {folder['name']}")
        listas_data = clickup_get(f"{base}/folder/{folder['id']}/list", token).get("lists", [])
        listas = []
        for lst in listas_data:
            tarefas = []
            page = 0
            while True:
                url = (
                    f"{base}/list/{lst['id']}/task"
                    f"?page={page}&include_custom_fields=true&subtasks=true"
                )
                data = clickup_get(url, token)
                tasks = data.get("tasks", [])
                if not tasks:
                    break
                tarefas.extend(tasks)
                page += 1
            print(f"    Lista: {lst['name']} ({len(tarefas)} tarefas)")
            listas.append({"list_id": lst["id"], "list_name": lst["name"], "tarefas": tarefas})
        pastas.append({"folder_id": folder["id"], "folder_name": folder["name"], "listas": listas})

    return {"pastas": pastas}


def load_from_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Transformação
# ---------------------------------------------------------------------------
def detect_type(name):
    for pattern, ctype in TYPE_PATTERNS:
        if pattern.search(name):
            return ctype
    return None


def get_custom_field(task, names):
    for cf in task.get("custom_fields", []):
        if cf["name"] in names and "value" in cf:
            return cf["value"]
    return None


def ms_to_date(ms):
    if not ms:
        return None
    dt = datetime.fromtimestamp(int(ms) / 1000, tz=TZ_BR)
    return dt.date().isoformat()


def transform(raw_data):
    """Retorna (clients, posts, skipped)."""
    clients = {}  # clickup_list_id -> {name, clickup_list_id}
    posts = []
    skipped = []

    for folder in raw_data["pastas"]:
        if folder["folder_name"] in SKIP_FOLDERS:
            continue
        for lst in folder["listas"]:
            if lst["list_name"] in SKIP_LISTS:
                continue

            clients[lst["list_id"]] = {
                "clickup_list_id": lst["list_id"],
                "name": lst["list_name"].strip(),
            }

            for t in lst["tarefas"]:
                name = re.sub(r"\s+", " ", t["name"]).strip()
                status_cu = t["status"]["status"]
                ctype = detect_type(name)
                date_str = ms_to_date(get_custom_field(t, DATE_FIELD_NAMES))

                in_scope = status_cu in INCLUDE_CLICKUP_STATUSES
                if not (in_scope and ctype and date_str):
                    skipped.append({
                        "client": lst["list_name"], "title": name,
                        "status_clickup": status_cu,
                        "in_scope_status": in_scope,
                        "has_type": bool(ctype), "has_date": bool(date_str),
                        "task_url": t.get("url", ""),
                    })
                    continue

                posts.append({
                    "clickup_task_id": t["id"],
                    "clickup_list_id": lst["list_id"],
                    "date": date_str,
                    "title": name,
                    "content_type": ctype,
                    "status": STATUS_MAP[status_cu],
                    "drive_link": get_custom_field(t, DRIVE_FIELD_NAMES) or None,
                })

    return list(clients.values()), posts, skipped


# ---------------------------------------------------------------------------
# Supabase (via REST/PostgREST)
# ---------------------------------------------------------------------------
class Supabase:
    def __init__(self, url, service_role_key):
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def upsert(self, table, rows, on_conflict, returning=True):
        if not rows:
            return []
        headers = dict(self.headers)
        headers["Prefer"] = "resolution=merge-duplicates" + (",return=representation" if returning else "")
        resp = requests.post(
            f"{self.base}/{table}?on_conflict={on_conflict}",
            headers=headers,
            json=rows,
        )
        if not resp.ok:
            sys.exit(f"Erro ao gravar em `{table}`: {resp.status_code} {resp.text}")
        return resp.json() if returning else []

    def insert(self, table, rows, returning=True):
        if not rows:
            return []
        headers = dict(self.headers)
        if returning:
            headers["Prefer"] = "return=representation"
        resp = requests.post(f"{self.base}/{table}", headers=headers, json=rows)
        if not resp.ok:
            sys.exit(f"Erro ao inserir em `{table}`: {resp.status_code} {resp.text}")
        return resp.json() if returning else []

    def patch(self, table, filters, update):
        params = dict(filters)
        resp = requests.patch(f"{self.base}/{table}", headers=self.headers, params=params, json=update)
        if not resp.ok:
            sys.exit(f"Erro ao atualizar `{table}`: {resp.status_code} {resp.text}")

    def select(self, table, params):
        resp = requests.get(f"{self.base}/{table}", headers=self.headers, params=params)
        if not resp.ok:
            sys.exit(f"Erro ao ler `{table}`: {resp.status_code} {resp.text}")
        return resp.json()


# ---------------------------------------------------------------------------
# Relatório (dry-run)
# ---------------------------------------------------------------------------
def print_report(clients, posts, skipped):
    print()
    print(f"Clientes (listas do ClickUp): {len(clients)}")
    print(f"Posts a sincronizar: {len(posts)}")
    print(f"Tarefas ignoradas: {len(skipped)}")
    print()
    print("Distribuição de content_type:", Counter(p["content_type"] for p in posts))
    print("Distribuição de status:", Counter(p["status"] for p in posts))
    print("Posts sem drive_link:", sum(1 for p in posts if not p["drive_link"]))

    out_dir = PROJECT_ROOT / "scripts" / "sync_output"
    out_dir.mkdir(exist_ok=True)
    with open(out_dir / "preview_posts.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(posts[0].keys()) if posts else [])
        w.writeheader()
        w.writerows(posts)
    if skipped:
        with open(out_dir / "skipped_tasks.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(skipped[0].keys()))
            w.writeheader()
            w.writerows(skipped)
    print(f"\nRelatórios salvos em: {out_dir}")


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--json", help="Usa um backup JSON local em vez de chamar a API do ClickUp ao vivo")
    parser.add_argument("--apply", action="store_true", help="Grava de verdade no Supabase (padrão: só mostra o relatório)")
    args = parser.parse_args()

    env = load_config()

    if args.json:
        raw_data = load_from_json(args.json)
    else:
        token = env.get("CLICKUP_API_TOKEN")
        space_id = env.get("CLICKUP_SPACE_ID")
        if not token or not space_id:
            sys.exit(
                "Faltando CLICKUP_API_TOKEN / CLICKUP_SPACE_ID.\n"
                "Copie .env.clickup.example para .env.clickup e preencha, "
                "ou rode com --json caminho/para/backup.json"
            )
        raw_data = fetch_from_clickup_api(token, space_id)

    clients, posts, skipped = transform(raw_data)
    print_report(clients, posts, skipped)

    if not args.apply:
        print("\nModo simulação (dry-run). Nada foi gravado no Supabase.")
        print("Revise os CSVs em scripts/sync_output/ e rode de novo com --apply quando estiver ok.")
        return

    sb = Supabase(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

    print("\nGravando clientes no Supabase...")
    all_list_ids = [c["clickup_list_id"] for c in clients]
    existing = sb.select(
        "clients",
        {"clickup_list_id": f"in.({','.join(all_list_ids)})", "select": "id,clickup_list_id,name,access_code"},
    )
    existing_by_list = {c["clickup_list_id"]: c for c in existing}

    new_clients = [c for c in clients if c["clickup_list_id"] not in existing_by_list]
    for c in new_clients:
        c["access_code"] = generate_access_code(c["name"])

    inserted = sb.insert("clients", new_clients) if new_clients else []
    if new_clients:
        print(f"  {len(inserted)} cliente(s) novo(s) criado(s):")
        for c in inserted:
            print(f"    {c['name']} -> código de acesso: {c['access_code']}")

    # atualiza o nome de clientes que já existiam, se mudou no ClickUp (nunca mexe no access_code)
    renamed = 0
    for c in clients:
        prev = existing_by_list.get(c["clickup_list_id"])
        if prev and prev["name"] != c["name"]:
            sb.patch("clients", {"id": f"eq.{prev['id']}"}, {"name": c["name"]})
            renamed += 1
    if renamed:
        print(f"  {renamed} cliente(s) com nome atualizado.")

    list_id_to_client_id = {lid: c["id"] for lid, c in existing_by_list.items()}
    list_id_to_client_id.update({c["clickup_list_id"]: c["id"] for c in inserted})


    for p in posts:
        p["client_id"] = list_id_to_client_id.get(p["clickup_list_id"])
        del p["clickup_list_id"]

    missing_client = [p for p in posts if not p["client_id"]]
    if missing_client:
        sys.exit(f"Erro: {len(missing_client)} posts sem client_id resolvido. Abortando gravação de posts.")

    print("Gravando posts no Supabase...")
    sb.upsert("posts", posts, on_conflict="clickup_task_id", returning=False)

    print(f"\n✅ Sincronização concluída: {len(clients)} clientes, {len(posts)} posts.")


if __name__ == "__main__":
    main()
