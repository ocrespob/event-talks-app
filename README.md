# BigQuery Release Notes & Share Hub

A modern web application that fetches the latest Google Cloud BigQuery Release Notes, parses them, organizes them into a responsive dashboard, and allows you to customize and share them directly on X (formerly Twitter) with an integrated Composer Modal.

## Features

-   **Feed Aggregation & Splitting**: Google publishes release notes grouped by date. This application parses the XML feed and splits combined daily updates (e.g. Features, Issues, Announcements) into individual selectable cards.
-   **In-Memory Caching**: Implements a 5-minute caching mechanism to prevent excessive API requests to Google's feed.
-   **Forced Refresh**: A manual refresh button with a spinner to force the backend to fetch fresh updates.
-   **Type Filters & Keyword Search**: Filter cards dynamically by type (Features, Announcements, Issues, Deprecations, and Changes) or search text content in real-time.
-   **X/Twitter Composer Modal**: Select any update to open a pre-filled composer. It simulates Twitter's URL-shortening character logic (links are budgeted at exactly 23 characters) and features an interactive circular SVG character counter.
-   **Premium Dark UI**: A responsive layout built using modern CSS variables, glassmorphic card stylings, custom animations, and FontAwesome icons.

---

## Directory Structure

```
bq-releases-notes/
├── venv/                       # Python virtual environment (git-ignored)
├── templates/
│   └── index.html              # Frontend DOM structure & Twitter composer modal
├── static/
│   ├── css/
│   │   └── style.css           # Custom dark theme stylesheet
│   └── js/
│       └── main.js             # State controller, search/filter logic, modal logic
├── app.py                      # Flask Server, feed parsing & memory cache
├── requirements.txt            # Python dependencies
├── .gitignore                  # Git ignore definitions
└── README.md                   # Project documentation
```

---

## Technical Stack

-   **Backend**: Python, [Flask](https://flask.palletsprojects.com/) (routing/API), [feedparser](https://github.com/kurtmckee/feedparser) (XML processing), [BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/) (HTML splitting).
-   **Frontend**: Vanilla HTML5, CSS3 (Variables, Gradients, Flexbox/Grid), JavaScript (ES6 fetch, state management).
-   **External Assets**: Google Fonts (Inter, Outfit), FontAwesome CDN (icons).

---

## Getting Started

### Prerequisites

Ensure you have Python 3.10+ installed on your local machine.

### Installation

1.  **Clone / Open Project Directory**:
    ```bash
    cd C:\Users\ocres\agy-cli-projects\bq-releases-notes
    ```

2.  **Activate Virtual Environment**:
    -   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    -   **Windows (CMD)**:
        ```cmd
        .\venv\Scripts\activate.bat
        ```
    -   **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

---

## Running the Application

1.  Start the Flask local development server:
    ```bash
    python app.py
    ```
2.  Open your web browser and navigate to:
    [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Running Tests

To verify that the XML parsing and API endpoints are working correctly, run the integration tests using the virtual environment python:

```bash
python -m unittest scratch/test_app.py
```
