// import { RateLimiterRedis } from "rate-limiter-flexible";
// import Redis from "ioredis";

// const redisClient = new Redis({
//   host: "127.0.0.1", // Redis host
//   port: 6379, // default Redis port
//   enableOfflineQueue: false,
// });

// const baseRateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: "rate_limit_global",
//   points: 100,
//   duration: 60,
//   blockDuration: 600,
// });

// export const rateLimiterMiddleware = async (req, res, next) => {
//   try {
//     const ip = req.ip;
//     const role = req.user?.role || "guest";

//     let points, duration, blockDuration;
//     switch (role) {
//       case "admin":
//         points = 10;
//         duration = 60;
//         blockDuration = 60;
//         break;
//       case "premium":
//         points = 5;
//         duration = 60;
//         blockDuration = 180;
//         break;
//       default:
//         points = 5;
//         duration = 60;
//         blockDuration = 600;
//     }

//     const limiter = new RateLimiterRedis({
//       storeClient: redisClient,
//       keyPrefix: `rate_limit_${role}`,
//       points,
//       duration,
//       blockDuration,
//       execEvenly: false,
//     });

//     try {
//       await limiter.consume(ip);
//       next();
//     } catch (err) {
//       if (err.remainingPoints === 0) {
//         console.warn(`🚫 [RateLimit] IP blocked: ${ip} | Role: ${role}`);
//       }

//       const secs = Math.round(err.msBeforeNext / 1000) || blockDuration;

//       return res.status(429).json({
//         success: false,
//         message: `Too many requests! Try again in ${secs} seconds.`,
//       });
//     }
//   } catch (error) {
//     console.error("RateLimiter Error:", error);
//     res.status(500).json({ message: "Internal rate limiter error." });
//   }
// };
