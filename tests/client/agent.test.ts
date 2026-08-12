import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  generateGeminiContent,
} from "../../src/client/agent.js";


describe("Gemini request handling", () => {
  it(
    "retries a temporary Gemini 429 error",
    async () => {
      const generateContent =
        vi
          .fn()
          .mockRejectedValueOnce({
            status: 429,
            message:
              "Please retry in 0.01s.",
          })
          .mockResolvedValueOnce({
            text: "success",
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [],
                },
              },
            ],
          });

      const ai = {
        models: {
          generateContent,
        },
      } as any;

      const result =
        await generateGeminiContent(
          ai,
          "test-model",
          [],
          {}
        );

      expect(result.text).toBe(
        "success"
      );

      expect(
        generateContent
      ).toHaveBeenCalledTimes(2);
    }
  );


  it(
    "does not retry daily quota errors",
    async () => {
      const generateContent =
        vi
          .fn()
          .mockRejectedValue({
            status: 429,
            message:
              "Quota exceeded for metric: " +
              "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
          });

      const ai = {
        models: {
          generateContent,
        },
      } as any;

      await expect(
        generateGeminiContent(
          ai,
          "test-model",
          [],
          {}
        )
      ).rejects.toThrow(
        "Gemini daily quota exceeded"
      );

      expect(
        generateContent
      ).toHaveBeenCalledTimes(1);
    }
  );


  it(
    "retries temporary server errors",
    async () => {
      const generateContent =
        vi
          .fn()
          .mockRejectedValueOnce({
            status: 503,
            message:
              "Service unavailable",
          })
          .mockResolvedValueOnce({
            text: "success",
            candidates: [
              {
                content: {
                  role: "model",
                  parts: [],
                },
              },
            ],
          });

      const ai = {
        models: {
          generateContent,
        },
      } as any;

      const result =
        await generateGeminiContent(
          ai,
          "test-model",
          [],
          {},
          {
            baseDelayMs: 1,
          }
        );

      expect(result.text).toBe(
        "success"
      );

      expect(
        generateContent
      ).toHaveBeenCalledTimes(2);
    }
  );


  it(
    "throws after maximum retries",
    async () => {
      const generateContent =
        vi
          .fn()
          .mockRejectedValue({
            status: 503,
            message:
              "Service unavailable",
          });

      const ai = {
        models: {
          generateContent,
        },
      } as any;

      await expect(
        generateGeminiContent(
          ai,
          "test-model",
          [],
          {},
          {
            maxRetries: 2,
            baseDelayMs: 1,
          }
        )
      ).rejects.toMatchObject({
        status: 503,
      });

      expect(
        generateContent
      ).toHaveBeenCalledTimes(3);
    }
  );


  it(
    "does not retry non-retryable errors",
    async () => {
      const generateContent =
        vi
          .fn()
          .mockRejectedValue({
            status: 400,
            message:
              "Invalid request",
          });

      const ai = {
        models: {
          generateContent,
        },
      } as any;

      await expect(
        generateGeminiContent(
          ai,
          "test-model",
          [],
          {}
        )
      ).rejects.toMatchObject({
        status: 400,
      });

      expect(
        generateContent
      ).toHaveBeenCalledTimes(1);
    }
  );
});