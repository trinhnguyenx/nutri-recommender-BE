import express, { Express } from "express";
import authRouter from "./api/auth/auth.router";
import CaloriesRouter from "./api/calories/calories.router";
import Chatbot from "./api/chatbot/chatbot.router";
import Payos from "./api/payos/payos.router";
import dataSource from "./config/typeorm.config";
import { pino } from "pino";
import cors from "cors";
import 'module-alias/register';


const app: Express = express();
const port = 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://healthyfit-ria.netlify.app',
      'http://localhost:5173'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const logger = pino({ name: "server start" });

async function startApp() {
  try {
    await dataSource.initialize();
    logger.info("Data Source has been initialized!");

    app.use("/auth", authRouter);
    app.use("/calories", CaloriesRouter);
    app.use("/chatbot", Chatbot);
    app.use("/payos", Payos);

    app.listen(port, () => {
      console.log(`[server]: Server is running at http://localhost:${port}`);
    });

  } catch (error) {
    logger.error("Error during Data Source initialization:", error);
    console.error("Error during Data Source initialization:", error);
  }
}

startApp();

