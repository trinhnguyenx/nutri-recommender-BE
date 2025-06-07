import { Router } from "express";
import { AuthController } from "./auth.controller";
const authRouter = Router();

authRouter.post("/register", AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.get("/user/", AuthController.getUser);
authRouter.get("/user/:id", AuthController.getUserById);
authRouter.patch("/user/:id", AuthController.updateUser);

export default authRouter;
