// // workers/reportWorker.js
// import { Worker } from "bullmq";
// import redis from "../redisClient.js";
// import logger from "../logger.js";
// import AWS from "aws-sdk";
// import { createObjectCsvWriter } from "csv-writer";
// import fs from "fs";
// import path from "path";

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// const worker = new Worker(
//   "transactionReports",
//   async (job) => {
//     logger.info("worker.job.start", { name: job.name, data: job.data });

//     const { startDate, endDate, summary } = job.data;
//     const filename = `tx_report_${Date.now()}.csv`;
//     const filepath = path.join("/tmp", filename);

//     const csvWriter = createObjectCsvWriter({
//       path: filepath,
//       header: [
//         { id: "metric", title: "Metric" },
//         { id: "value", title: "Value" },
//       ],
//     });
//     const records = Object.entries(summary).map(([k, v]) => ({
//       metric: k,
//       value: String(v),
//     }));
//     await csvWriter.writeRecords(records);

//     const fileContent = fs.readFileSync(filepath);
//     const s3Key = `${process.env.REPORT_S3_FOLDER || "reports/"}${filename}`;
//     await s3
//       .putObject({
//         Bucket: process.env.AWS_S3_BUCKET,
//         Key: s3Key,
//         Body: fileContent,
//         ContentType: "text/csv",
//       })
//       .promise();

//     logger.info("worker.job.complete", {
//       s3Key,
//       bucket: process.env.AWS_S3_BUCKET,
//     });

//     // cleanup
//     fs.unlinkSync(filepath);
//   },
//   { connection: { host: redis.options.host, port: redis.options.port } }
// );

// worker.on("failed", (job, err) => {
//   logger.error("worker.job.failed", {
//     jobId: job.id,
//     name: job.name,
//     err: err.message,
//   });
// });
