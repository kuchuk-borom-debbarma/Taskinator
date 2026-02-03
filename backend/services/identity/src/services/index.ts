import { IAuthService } from "./auth/IAuthService";
import { AuthServiceImpl } from "./auth/internal/AuthServiceImpl";
import { INotiService } from "./noti/INotiService";
import { NotiServiceConsole } from "./noti/NotiServiceConsole";

export const authService: IAuthService = new AuthServiceImpl();
export const notiService: INotiService = new NotiServiceConsole();
