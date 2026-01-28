import winston from "winston";

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: jsonFormat,
  transports: [
    new winston.transports.Console(),
    // In production add CloudWatch/Loki transport or file transport with rotation
    new winston.transports.File({
      filename: "logs/app.log",
      maxsize: 5 * 1024 * 1024,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
});

export default logger;
