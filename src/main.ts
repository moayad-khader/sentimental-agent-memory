import "reflect-metadata";
import "dotenv/config";
import { AppModule } from "@/app.module";

AppModule.bootstrap().catch(console.error);
