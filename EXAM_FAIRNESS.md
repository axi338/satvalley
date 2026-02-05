# SAT Valley Exam Fairness & Integrity System

## 🛡️ Fairness Philosophy
Our system is designed to verify that exam results represent your own work, ensuring a fair playing field for all students competing on the Global Leaderboard. We use automated monitoring to detect "Severity Levels" of potential academic dishonesty.

## 👁️ What We Monitor
During a secure **Olympiad Test Session**, the system monitors:

1.  **Window Focus**: Leaving the test window (Alt-Tab, clicking other apps).
2.  **Fullscreen Status**: Exiting full-screen mode.
3.  **Cursor Movement**: Moving the cursor outside the test viewport.

---

## 🚦 Violation Severity Levels
We distinguish between accidental slips and intentional cheating attempts.

### 🟢 Level 1: Minor (No Penalty)
*   **Examples**: Accidental mouse slip outside window while in windowed mode, brief notification popup steal focus.
*   **Action**: A soft "Check Focus" toast appears. No permanent log.
*   **Status**: Test continues normally.

### 🟡 Level 2: Warning (Logged)
*   **Examples**: Intentionally switching tabs for <2 seconds, repeated focus loss.
*   **Action**: A warning alert ("Please keep focus"). Incident logged.
*   **Status**: Test continues, but excessive warnings may flag the session.

### 🔴 Level 3: Critical (Termination)
*   **Examples**: 
    - Exiting Fullscreen Mode and refusing to return.
    - Sustained focus loss (>10 seconds) implying research on another screen.
    - Multiple repeated Level 2 violations (3+ strikes).
*   **Action**: Test session is **TERMINATED** immediately. Score is recorded as 0 or disqualified.
*   **Status**: Global Leaderboard ban for the season.

## ✏️ Allowed Tools
You permitted to use:
-   **Desmos Calculator**: The built-in graphing calculator (click the Calculator icon). Using this does **NOT** trigger a violation.
-   **Reference Sheet**: The built-in math formula sheet.
-   **Annotation Tools**: Highlighter and Strikethrough tools provided in the interface.

## ❌ Prohibited Actions
-   Using external software (ChatGPT, external calculators, search engines).
-   Using a second device (phone/tablet) - *Note: We do not currently use webcam monitoring, but statistical analysis of answer times may flag anomalous behavior.*
-   Screen sharing or remote desktop tools.

---
*For questions or appeals regarding an integrity flag, please contact support@satvalley.com with your Test ID.*
