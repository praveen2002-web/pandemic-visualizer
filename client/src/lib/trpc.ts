import { createTRPCReact } from "@trpc/react-query";
// @ts-ignore
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
