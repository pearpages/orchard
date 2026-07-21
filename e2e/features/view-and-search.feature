Feature: View and search cookies
  As a developer I want to see every cookie in the browser and filter them fast,
  so that I can spot cookies from other domains that affect my auth flows.

  Scenario: The manager lists cookies grouped by domain
    Given the browser has cookies:
      | name    | domain       | value |
      | session | example.com  | abc   |
      | theme   | example.com  | dark  |
      | ga_id   | analytics.io | xyz   |
    When I open the manager page
    Then I see a domain group "example.com" with 2 cookies
    And I see a domain group "analytics.io" with 1 cookie

  Scenario: Search filters cookies across domains
    Given the browser has cookies:
      | name    | domain       | value |
      | session | example.com  | abc   |
      | theme   | example.com  | dark  |
      | ga_id   | analytics.io | xyz   |
    When I open the manager page
    And I search for "session"
    Then I see 1 cookie row
    And the row shows cookie "session" for domain "example.com"

  Scenario: domain: prefix scopes the search to domains only
    Given the browser has cookies:
      | name  | domain       | value       |
      | ga_id | analytics.io | example-ref |
      | sid   | example.com  | abc         |
    When I open the manager page
    And I search for "domain:example"
    Then I see 1 cookie row
    And the row shows cookie "sid" for domain "example.com"
