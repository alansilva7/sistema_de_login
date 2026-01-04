import { Router } from "express";
import UserController from "./app/UserController";
import SubscribeController from "./app/SubscribeController";

const routes = Router();

routes.post("/users", UserController.store);
routes.post("/subscribe", SubscribeController.store)

export default routes;
