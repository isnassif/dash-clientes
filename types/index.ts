export type ContentType = "Reels" | "Story" | "Ads" | "Card" | "Carrossel";
export type PostStatus = "Pendente" | "Aprovado" | "Publicado";

export type Client = {
  id: string;
  name: string;
};

export type Post = {
  id: string;
  client_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content_type: ContentType;
  status: PostStatus;
  drive_link: string | null;
  created_at: string;
  updated_at: string;
};
