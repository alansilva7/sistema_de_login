import { Request, Response } from "express";
import { prisma } from "../prisma";

interface CreateUserBody {
  email: string;
  name?: string;
  password: string;
}

class UserController {
  async store(req: Request<{}, {}, CreateUserBody>, res: Response) {
    const { email, name, password } = req.body;

    const userExicts = await prisma.users.findUnique({
      where: { email },
    });

    if (userExicts) {
      return res.status(400).json({ error: "Usuario já cadastrado." });
    }

    const user = await prisma.users.create({
      data: {
        email,
        name,
        password,
      },
    });

    return res.status(201).json(user);
  }
}

export default new UserController();
