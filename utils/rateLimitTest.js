import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE_URL = "http://localhost:8000";
const PUBLIC_ROUTE = "/api/users/login";
const PRIVATE_ROUTE = "/api/users/getProfile";

export default function () {
  const res = http.post(
    `${BASE_URL}${PUBLIC_ROUTE}`,
    JSON.stringify({
      email: "test@example.com",
      password: "12345678",
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, {
    "status is 200/401/429": (r) => [200, 401, 429].includes(r.status),
  });

  sleep(0.5);
}
