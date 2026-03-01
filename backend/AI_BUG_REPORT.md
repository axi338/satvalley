# Bug Report: AI Integration Failures (Feb 11, 2026)

This report documents the specific reasons why the AI integration was failing and the steps taken to resolve them.

## 1. Google AI Studio: Quota Exhaustion (429)
- **Error:** `[429 Too Many Requests] You exceeded your current quota.`
- **Reason:** The model `gemini-2.5-flash` was being used on a free-tier project. For this specific model name, Google AI Studio enforced a highly restricted quota of only **20 requests per day**.
- **Impact:** The "splitting" phase of PDF processing would fail almost immediately after 1-2 attempts.

## 2. Google AI Studio: API Disabled (403)
- **Error:** `[403 Forbidden] Generative Language API has not been used in project... or it is disabled.`
- **Reason:** After an API key change, the new Google Cloud project associated with the key did not have the **Generative Language API** enabled in the library console.
- **Impact:** All AI requests were blocked by Google at the project level.

## 3. Google AI Studio: API Key Restricted (403)
- **Error:** `[403 Forbidden] Requests to this API... are blocked. (API_KEY_SERVICE_BLOCKED)`
- **Reason:** Even with the API enabled, the specific API Key in use had **API Restrictions** applied to it. It was restricted to Firebase and Cloud SQL services only, explicitly blocking the Generative Language API.
- **Impact:** Requests were blocked at the credential level.

## 4. Vertex AI: Model Not Found (404)
- **Error:** `[VertexAI.ClientError]: got status: 404 Not Found.`
- **Reason:** During the initial migration back to Vertex AI, the code attempted to access `gemini-1.5-flash` using a project number instead of a verified **Project ID string**. Additionally, some model versions/aliases are region-specific.
- **Impact:** Backend could not locate the model endpoint on Google Cloud.

## Resolution
The system has been fully migrated to **Vertex AI** using the following configuration:
- **SDK:** `@google-cloud/vertexai`
- **Model:** `gemini-2.5-flash`
- **Location:** `us-central1`
- **Auth:** Application Default Credentials (ADC) with Project ID `567793903488`.

**Status:** Fixed and verified.
