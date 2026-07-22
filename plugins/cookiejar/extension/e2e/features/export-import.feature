Feature: Export and import cookies
  Exporting and re-importing cookies lets developers save and restore
  auth states between sessions.

  Scenario: Round-trip a domain export
    Given the browser has cookies:
      | name   | domain           | value |
      | state  | auth0.local.test | s1    |
      | nonce  | auth0.local.test | n1    |
    When I open the manager page
    And I export cookies for domain "auth0.local.test"
    And all cookies are deleted
    And I import the previously exported file
    Then the browser has 2 cookies for "auth0.local.test"

  Scenario: Round-trip a cookies.txt export of the view
    Given the browser has cookies:
      | name   | domain           | value |
      | state  | auth0.local.test | s1    |
      | nonce  | auth0.local.test | n1    |
    When I open the manager page
    And I export the view as cookies.txt
    And all cookies are deleted
    And I import the previously exported file
    Then the browser has 2 cookies for "auth0.local.test"

  Scenario: Round-trip a CSV export of the view
    Given the browser has cookies:
      | name   | domain           | value |
      | state  | auth0.local.test | s1    |
      | nonce  | auth0.local.test | n1    |
    When I open the manager page
    And I export the view as CSV
    And all cookies are deleted
    And I import the previously exported file
    Then the browser has 2 cookies for "auth0.local.test"
