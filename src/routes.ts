import { Router } from "express";
import UserController from "./app/UserController";
import QueueController from "./app/QueueController";

const routes = Router();

routes.post("/users", UserController.store);

routes.post("/queues", QueueController.store);

export default routes;
