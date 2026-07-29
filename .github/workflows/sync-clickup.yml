name: Sync ClickUp -> Supabase

# Aciona a sincronização manualmente pelo botão "Run workflow" na aba Actions
# do GitHub. Não precisa de terminal nem de nada instalado na sua máquina.
on:
  workflow_dispatch:
    inputs:
      apply:
        description: "Gravar de verdade no Supabase (deixe desmarcado na primeira vez, pra só ver o relatório)"
        type: boolean
        default: false

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - run: pip install requests

      - name: Rodar sincronização
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          CLICKUP_API_TOKEN: ${{ secrets.CLICKUP_API_TOKEN }}
          CLICKUP_SPACE_ID: ${{ secrets.CLICKUP_SPACE_ID }}
        run: |
          if [ "${{ inputs.apply }}" = "true" ]; then
            python3 scripts/sync_clickup.py --apply
          else
            python3 scripts/sync_clickup.py
          fi

      - name: Salvar relatório (CSV) como download
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: relatorio-sincronizacao
          path: scripts/sync_output/
          if-no-files-found: ignore
