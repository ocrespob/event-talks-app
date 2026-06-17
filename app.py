import time
from flask import Flask, jsonify, render_template, request
import requests
import feedparser
from bs4 import BeautifulSoup
import copy

app = Flask(__name__)

# Cache structure to store parsed updates in memory
cache = {
    'updates': None,
    'last_updated': 0,
    'expiry': 300  # Cache for 5 minutes (300 seconds)
}

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def parse_feed():
    """Fetches and parses the XML feed, extracting individual update items."""
    try:
        # Use requests to fetch with a timeout
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML with feedparser using content of response
        feed = feedparser.parse(response.content)
        
        updates = []
        for entry in feed.entries:
            date_str = entry.get('title', 'Unknown Date')
            entry_link = entry.get('link', 'https://cloud.google.com/bigquery/docs/release-notes')
            summary = entry.get('summary', '')
            
            soup = BeautifulSoup(summary, 'html.parser')
            headings = soup.find_all('h3')
            
            # If no h3 elements, treat the whole entry as a single update
            if not headings:
                content_html = str(soup)
                content_text = soup.get_text().strip()
                updates.append({
                    'id': entry.get('id', date_str),
                    'date': date_str,
                    'type': 'Update',
                    'content_html': content_html,
                    'content_text': content_text,
                    'link': entry_link
                })
                continue
                
            for i, h3 in enumerate(headings):
                update_type = h3.get_text().strip()
                
                # Extract all siblings until the next h3
                sibling_elements = []
                for sib in h3.next_siblings:
                    if sib.name == 'h3':
                        break
                    sibling_elements.append(sib)
                
                # Reconstruct HTML and clean text
                section_soup = BeautifulSoup('', 'html.parser')
                for sib in sibling_elements:
                    section_soup.append(copy.copy(sib))
                    
                content_html = str(section_soup)
                content_text = section_soup.get_text().strip()
                
                # Generate a unique ID based on entry ID or date
                base_id = entry.get('id', date_str)
                update_id = f"{base_id}_{i}"
                
                updates.append({
                    'id': update_id,
                    'date': date_str,
                    'type': update_type,
                    'content_html': content_html,
                    'content_text': content_text,
                    'link': entry_link
                })
                
        return updates, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Return cached updates if they exist and are not expired (and not forced refresh)
    if not force_refresh and cache['updates'] is not None and (current_time - cache['last_updated'] < cache['expiry']):
        return jsonify({
            'success': True,
            'source': 'cache',
            'last_updated': cache['last_updated'],
            'updates': cache['updates']
        })
        
    # Fetch fresh updates
    updates, error = parse_feed()
    if error:
        # If fetch fails but we have cached updates, fall back to cache
        if cache['updates'] is not None:
            return jsonify({
                'success': True,
                'source': 'cache_fallback',
                'error': f"Failed to refresh: {error}. Serving cached data.",
                'last_updated': cache['last_updated'],
                'updates': cache['updates']
            })
        return jsonify({
            'success': False,
            'error': error
        }), 500
        
    # Update cache
    cache['updates'] = updates
    cache['last_updated'] = current_time
    
    return jsonify({
        'success': True,
        'source': 'network',
        'last_updated': cache['last_updated'],
        'updates': updates
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
