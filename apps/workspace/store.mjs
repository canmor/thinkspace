import { DatabaseSync } from "node:sqlite";

import { validateWorkspace } from "./integrity.mjs";
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL");
  const version = db.prepare("PRAGMA user_version").get().user_version;
  if (version > 1) {
    db.close();
    throw Error("Unsupported workspace database version");
  }
  db.exec(
    "CREATE TABLE IF NOT EXISTS workspace (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL); PRAGMA user_version=1",
  );
  const read = db.prepare("SELECT revision,document FROM workspace WHERE id=?");
  return {
    list() {
      return db
        .prepare(
          "SELECT id,CASE WHEN json_valid(document) THEN json_extract(document,'$.name') ELSE 'Damaged workspace' END AS name FROM workspace ORDER BY rowid",
        )
        .all();
    },
    read(id) {
      const row = read.get(id);
      if (!row) throw Error("Workspace unavailable");
      const value = JSON.parse(row.document);
      validateWorkspace(value, id);
      return { revision: row.revision, value };
    },
    save(value, expectedRevision) {
      validateWorkspace(value);
      const document = JSON.stringify(value);
      if (expectedRevision === 0) {
        db.prepare("INSERT INTO workspace VALUES(?,1,?)").run(
          value.id,
          document,
        );
      } else {
        const changed = db
          .prepare(
            "UPDATE workspace SET revision=revision+1,document=? WHERE id=? AND revision=?",
          )
          .run(document, value.id, expectedRevision);
        if (!changed.changes)
          throw Error("Workspace changed. Reopen the latest revision.");
      }
      return expectedRevision + 1;
    },
    close() {
      db.close();
    },
  };
}
