import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("job endpoints", () => {
  const app = createApp();
  it("reject missing or wrong secrets", async () => {
    await request(app).post("/jobs/refresh").expect(401);
    await request(app).post("/jobs/send").set("authorization", "Bearer nope").expect(401);
  });
  it("404s unknown api routes as json", async () => {
    const res = await request(app).get("/api/nope").expect(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});
