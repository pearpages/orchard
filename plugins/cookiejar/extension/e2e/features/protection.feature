Feature: Protecting cookies and domains
  Protected domains survive even a full "delete everything",
  so a dev can keep their auth0 session while nuking the rest.

  Scenario: Delete everything keeps protected domains
    Given the browser has cookies:
      | name  | domain      | value |
      | sid   | example.com | abc   |
      | keep1 | keep.me     | k1    |
      | keep2 | keep.me     | k2    |
    When I open the manager page
    And I protect the domain "keep.me"
    And I delete everything typing the confirmation
    Then the browser has 0 cookies for "example.com"
    And the browser has 2 cookies for "keep.me"
    And a toast says "Deleted 1 cookie — 2 protected kept"
