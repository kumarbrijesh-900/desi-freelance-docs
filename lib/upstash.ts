import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.warn(
    "⚠️ Upstash Redis environment variables are missing. Ratelimiting will be disabled.",
  );
}

export const redis = new Redis({
  url: url || "https://dummy.upstash.io",
  token: token || "dummy",
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
  prefix: "lance_api_limit",
});
