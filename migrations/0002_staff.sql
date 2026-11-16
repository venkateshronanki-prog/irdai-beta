CREATE TABLE staff(email TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN('editor','reviewer','publisher','administrator')),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE drafts(id TEXT PRIMARY KEY,slug TEXT NOT NULL,title TEXT NOT NULL,kind TEXT NOT NULL,body TEXT NOT NULL DEFAULT '',summary TEXT NOT NULL DEFAULT '',reference TEXT NOT NULL DEFAULT '',document_date TEXT,source_url TEXT,status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','review','approved','published')),author TEXT NOT NULL,reviewer TEXT,version INTEGER NOT NULL DEFAULT 1,updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX drafts_status ON drafts(status,updated DESC);
CREATE TABLE write_guards(value INTEGER NOT NULL CHECK(value=1));
CREATE TABLE revisions(id INTEGER PRIMARY KEY,draft_id TEXT NOT NULL REFERENCES drafts(id),version INTEGER NOT NULL,snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),actor TEXT NOT NULL,created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(draft_id,version));
CREATE TABLE audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '',created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries cannot be edited'); END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries cannot be removed'); END;
CREATE TRIGGER snapshot_draft_insert AFTER INSERT ON drafts BEGIN
 INSERT INTO revisions(draft_id,version,snapshot,actor) VALUES(new.id,new.version,json_object('slug',new.slug,'title',new.title,'kind',new.kind,'body',new.body,'summary',new.summary,'reference',new.reference,'document_date',new.document_date,'source_url',new.source_url,'status',new.status),new.author);
END;
