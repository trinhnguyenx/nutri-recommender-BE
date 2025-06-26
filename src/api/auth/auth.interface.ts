import { User } from "../../model/users.entity";
interface Login {
  email: string;
  password: string;
}
interface Token {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
interface AuthResponseData {
    token: Token;
    user: User;
}
export type { Login, Token, AuthResponseData };
