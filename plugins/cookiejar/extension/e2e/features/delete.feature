Feature: Delete cookies
  Deleting must be quick for single cookies, confirmed for bulk actions,
  and must always respect protected cookies.

  Scenario: Delete a single cookie
    Given the browser has cookies:
      | name    | domain      | value |
      | session | example.com | abc   |
      | theme   | example.com | dark  |
    When I open the manager page
    And I delete the cookie "session"
    Then the browser has 1 cookie for "example.com"
    And a toast says 'Deleted "session"'

  Scenario: Delete all cookies for a domain, skipping protected ones
    Given the browser has cookies:
      | name    | domain      | value |
      | session | example.com | abc   |
      | theme   | example.com | dark  |
      | temp    | example.com | x     |
    When I open the manager page
    And I protect the cookie "session"
    And I delete all cookies for domain "example.com"
    And I confirm the dialog
    Then the browser has 1 cookie for "example.com"
    And a toast says "Deleted 2 cookies — 1 protected kept"
