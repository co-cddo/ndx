# FR Coverage Matrix - Feature 2

| FR        | Description                                  | Epic           | Stories        |
| --------- | -------------------------------------------- | -------------- | -------------- |
| FR-TRY-1  | Detect authentication (sessionStorage check) | Epic 5         | Story 5.1      |
| FR-TRY-2  | Initiate OAuth login redirect                | Epic 5         | Story 5.2      |
| FR-TRY-3  | Extract JWT from URL                         | Epic 5         | Story 5.3      |
| FR-TRY-4  | Store JWT in sessionStorage                  | Epic 5         | Story 5.3      |
| FR-TRY-5  | Clean up URL after token extraction          | Epic 5         | Story 5.3      |
| FR-TRY-6  | Retrieve JWT for API calls                   | Epic 5         | Story 5.6      |
| FR-TRY-7  | Clear JWT on sign-out                        | Epic 5         | Story 5.5      |
| FR-TRY-8  | Persist auth across tabs                     | Epic 5         | Story 5.4      |
| FR-TRY-9  | Clear auth on browser restart                | Epic 5         | Story 5.4      |
| FR-TRY-10 | Send Authorization header                    | Epic 5         | Story 5.6      |
| FR-TRY-11 | Display "Sign in" when unauthenticated       | Epic 5         | Story 5.1      |
| FR-TRY-12 | Display "Sign out" when authenticated        | Epic 5         | Story 5.1      |
| FR-TRY-13 | Sign in triggers OAuth redirect              | Epic 5         | Story 5.2      |
| FR-TRY-14 | Sign out clears sessionStorage               | Epic 5         | Story 5.5      |
| FR-TRY-15 | Use GOV.UK button styling                    | Epic 5         | Story 5.1      |
| FR-TRY-16 | Check auth status API                        | Epic 5         | Story 5.7      |
| FR-TRY-17 | Parse user session data                      | Epic 5         | Story 5.7      |
| FR-TRY-18 | Retrieve user leases                         | Epic 7         | Story 7.2      |
| FR-TRY-19 | Parse lease data                             | Epic 7         | Story 7.2      |
| FR-TRY-20 | Get lease templates                          | Epic 6         | Story 6.1      |
| FR-TRY-21 | Get AUP from configurations                  | Epic 6         | Story 6.7      |
| FR-TRY-22 | Request new lease                            | Epic 6         | Story 6.9      |
| FR-TRY-23 | Handle API errors                            | Epic 5         | Story 5.8      |
| FR-TRY-24 | Redirect to login on 401                     | Epic 5         | Story 5.8      |
| FR-TRY-25 | Render /try page route                       | Epic 7         | Story 7.1      |
| FR-TRY-26 | Show unauthenticated message                 | Epic 5         | Story 5.9      |
| FR-TRY-27 | Show sign in button on /try                  | Epic 5         | Story 5.9      |
| FR-TRY-28 | Fetch and display leases                     | Epic 7         | Story 7.1, 7.2 |
| FR-TRY-29 | Empty state if no leases                     | Epic 5         | Story 5.9      |
| FR-TRY-30 | Sessions table columns                       | Epic 7         | Story 7.3      |
| FR-TRY-31 | Relative time for past expiry                | Epic 7         | Story 7.5      |
| FR-TRY-32 | Absolute time for future expiry              | Epic 7         | Story 7.5      |
| FR-TRY-33 | Budget format                                | Epic 7         | Story 7.6      |
| FR-TRY-34 | Cost accrued 4 decimals                      | Epic 7         | Story 7.6      |
| FR-TRY-35 | Status badge color coding                    | Epic 7         | Story 7.4      |
| FR-TRY-36 | Sort sessions by date                        | Epic 7         | Story 7.3      |
| FR-TRY-37 | Distinguish active/expired                   | Epic 7         | Story 7.4      |
| FR-TRY-38 | Launch button for Active                     | Epic 7         | Story 7.7      |
| FR-TRY-39 | Launch opens AWS portal                      | Epic 7         | Story 7.7      |
| FR-TRY-40 | Remaining lease duration                     | Epic 7         | Story 7.8      |
| FR-TRY-41 | No launch for expired                        | Epic 7         | Story 7.7      |
| FR-TRY-42 | Parse try metadata                           | Epic 6         | Story 6.1      |
| FR-TRY-43 | Parse try_id metadata                        | Epic 6         | Story 6.1      |
| FR-TRY-44 | Generate Try tag                             | Epic 6         | Story 6.2      |
| FR-TRY-45 | Render tag in filters                        | Epic 6         | Story 6.2      |
| FR-TRY-46 | Filter by Try tag                            | Epic 6         | Story 6.3      |
| FR-TRY-47 | Render Try button                            | Epic 6         | Story 6.4      |
| FR-TRY-48 | Use govukButton isStartButton                | Epic 6         | Story 6.4      |
| FR-TRY-49 | Check auth before modal                      | Epic 6         | Story 6.5      |
| FR-TRY-50 | Redirect if unauthenticated                  | Epic 6         | Story 6.5      |
| FR-TRY-51 | Display modal overlay                        | Epic 6         | Story 6.6      |
| FR-TRY-52 | Modal shows duration                         | Epic 6         | Story 6.6      |
| FR-TRY-53 | Modal shows budget                           | Epic 6         | Story 6.6      |
| FR-TRY-54 | Fetch AUP text                               | Epic 6         | Story 6.7      |
| FR-TRY-55 | Scrollable AUP container                     | Epic 6         | Story 6.7      |
| FR-TRY-56 | AUP checkbox required                        | Epic 6         | Story 6.6      |
| FR-TRY-57 | Disable Continue until checked               | Epic 6         | Story 6.8      |
| FR-TRY-58 | Cancel closes modal                          | Epic 6         | Story 6.8      |
| FR-TRY-59 | Continue requests lease                      | Epic 6         | Story 6.9      |
| FR-TRY-60 | Loading indicator                            | Epic 6         | Story 6.9      |
| FR-TRY-61 | Navigate to /try on success                  | Epic 6         | Story 6.9      |
| FR-TRY-62 | Alert on 409 error                           | Epic 6         | Story 6.9      |
| FR-TRY-63 | Redirect on 409 error                        | Epic 6         | Story 6.9      |
| FR-TRY-64 | Alert on other errors                        | Epic 6         | Story 6.9      |
| FR-TRY-65 | Close modal after request                    | Epic 6         | Story 6.9      |
| FR-TRY-66 | Responsive UI (320px+)                       | Epic 8         | Story 8.5      |
| FR-TRY-67 | Sessions table mobile                        | Epic 8         | Story 8.5      |
| FR-TRY-68 | Modal mobile adaptation                      | Epic 8         | Story 8.5      |
| FR-TRY-69 | Sign in/out mobile nav                       | Epic 8         | Story 8.5      |
| FR-TRY-70 | Keyboard navigation                          | Epic 8         | Story 8.7      |
| FR-TRY-71 | Focus indicators                             | Epic 8         | Story 8.9      |
| FR-TRY-72 | Escape closes modal                          | Epic 8         | Story 8.7      |
| FR-TRY-73 | Modal focus trap                             | Epic 8         | Story 8.7      |
| FR-TRY-74 | Status ARIA labels                           | Epic 8         | Story 8.8      |
| FR-TRY-75 | Budget ARIA labels                           | Epic 8         | Story 8.6, 8.8 |
| FR-TRY-76 | Color contrast WCAG 2.2 AA                   | Epic 8         | Story 8.3      |
| FR-TRY-77 | Color + text for status                      | Epic 7, Epic 8 | Story 7.4, 8.8 |
| FR-TRY-78 | Form labels associated                       | Epic 8         | Story 8.8      |
| FR-TRY-79 | ARIA live regions                            | Epic 8         | Story 8.10     |

**Coverage Validation:** All 79 FRs mapped to stories ✓

---
