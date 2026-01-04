import express from "express"
import routes from "./routes"
import { queueManager } from "./modules/queue";
import { registerAll } from "./queue";

class App {
    public server:express.Application
    constructor() {
        this.server = express()

        this.middlewares();
        this.routes();
        this.queue();
    }

    middlewares() {
        this.server.use(express.json())
    }

    routes() {
        this.server.use(routes)
    }

    queue() {
        registerAll();
        queueManager.start();
    }
}

export default new App().server