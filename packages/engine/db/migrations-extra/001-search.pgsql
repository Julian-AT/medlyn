CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_search;
CREATE INDEX IF NOT EXISTS segments_search_bm25 ON segments
USING bm25 (id, text, text_en, patient_id, document_id)
WITH (
  key_field = 'id',
  text_fields = '{"text":{"tokenizer":{"type":"default"}},"text_en":{"tokenizer":{"type":"default"}},"patient_id":{"tokenizer":{"type":"raw"},"fast":true},"document_id":{"tokenizer":{"type":"raw"},"fast":true}}'
);
