import { randomUUID } from "node:crypto";
import { Database } from "./database.js";
import { buildRoutePath } from "./utils/build-route-path.js";
import { parse } from "csv-parse";
import fs from "node:fs";

const database = new Database();

export const routes = [
    {
        method: "GET",
        path: buildRoutePath("/tasks"),
        handle: (req, res) => {
            const { search } = req.query;

            const tasks = database.select(
                "tasks",
                search
                    ? {
                          title: search,
                          description: search,
                      }
                    : null
            );
            return res.setHeader("Content-type", "application/json").end(JSON.stringify(tasks));
        },
    },
    {
        method: "POST",
        path: buildRoutePath("/tasks"),
        handle: (req, res) => {
            const { title, description } = req.body;

            if (!title || !description) {
                return res.writeHead(400).end(JSON.stringify({ message: "Todos os campos são obrigatórios" }));
            }

            const task = {
                id: randomUUID(),
                title,
                description,
                created_at: new Date().toISOString(),
                update_at: null,
                completed_at: null,
            };

            database.insert("tasks", task);

            return res.writeHead(201).end();
        },
    },
    {
        method: "DELETE",
        path: buildRoutePath("/tasks/:id"),
        handle: (req, res) => {
            const { id } = req.params;

            const [task] = database.select('tasks', { id })

            if (!task) {
              return res.writeHead(404).end()
            }
            
            database.delete("tasks", id);

            return res.writeHead(204).end();
        },
    },
    {
        method: "PUT",
        path: buildRoutePath("/tasks/:id"),
        handle: (req, res) => {
            const { id } = req.params;
            const { title, description } = req.body;

            if (!title || !description) {
                return res.writeHead(400).end(JSON.stringify({ message: "Todos os campos são obrigatórios" }));
            }

            const [task] = database.select('tasks', { id })
      
            if (!task) {
              return res.writeHead(404).end()
            }

            database.update("tasks", id, {
                title,
                description,
            });

            return res.writeHead(204).end();
        },
    },
    {
        method: "PATCH",
        path: buildRoutePath("/tasks/:id/complete"),
        handle: (req, res) => {
            const { id } = req.params;
            const now = new Date();

            const [task] = database.select('tasks', { id })

            if (!task) {
              return res.writeHead(404).end()
            }

            database.update("tasks", id, {
                completed_at: new Date(),
            });

            return res.writeHead(204).end();
        },
    },
    {
        method: "POST",
        path: buildRoutePath("/tasks/upload-csv"),
        handle: async (req, res) => {
            const path = new URL("./tasks.csv", import.meta.url);

            const stream = fs.createReadStream(path);

            const csv = parse({
                delimiter: ",",
                skipEmptyLines: true,
                fromLine: 2,
            });

            const lines = stream.pipe(csv);

            for await (const line of lines) {
                const [title, description] = line;

                if(title && description) {
                    const task = {
                        id: randomUUID(),
                        title,
                        description,
                        created_at: new Date().toISOString(),
                        update_at: null,
                        completed_at: null,
                    };
    
                    database.insert("tasks", task);
                } else {
                    return res.writeHead(201).end(JSON.stringify({ message: "Algumas linhas não foram inseridas, pois os campos title e description são obrigatórios" }));
                }
            }
            return res.writeHead(201).end();
        },
    },
];
