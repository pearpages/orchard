Feature: Deep clean per origin
  Deep clean wipes localStorage, IndexedDB, service workers and caches
  for a domain browser-wide via chrome.browsingData.

  Scenario: Deep clean clears localStorage of the test origin
    Given a test page is open that sets localStorage "greeting" to "hello"
    And the browser has a cookie for the test origin
    When I open the manager page
    And I deep clean the test origin domain
    And I confirm the deep clean dialog
    Then the test page localStorage has 0 keys
