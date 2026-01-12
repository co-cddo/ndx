---
layout: page
title: Check assumptions
includeInBreadcrumbs: true
---

{% from "govuk/components/button/macro.njk" import govukButton %}
{% from "govuk/components/radios/macro.njk" import govukRadios %}

## Review the following assumptions based on what you described

To tackle the goal of ensuring that children within the London Borough of Hackney have access to their entitled free school meals, here’s an expanded plan covering the key touchpoints, stakeholders, data management, and communication strategies:

### 1. **Touchpoints in the Provision of Free School Meals**

- **Schools**: Primary and secondary schools within the borough are essential touchpoints as they are where the meals will be provided and distributed.
- **Catering suppliers**: These are the companies or services contracted to prepare and deliver meals to the schools. They play a critical role in the quality and type of meals provided.
- **Parents/Guardians**: Engagement with parents is crucial for gathering information on dietary needs and ensuring they are aware of the free meal provisions.
- **Local education authorities**: They oversee the implementation and monitoring of the programme, ensuring that the process aligns with policies and regulations.

### 2. **Availability and Provision of Meals**

- **School canteens**: Most schools have on-site facilities where meals are prepared or served. Understanding their current capacities and limitations will help in assessing whether additional resources or support is needed.
- **Centralised meal preparation**: Some schools might rely on off-site kitchens or third-party catering services to deliver meals, especially for schools without full kitchen facilities.
- **Grab-and-go options**: For schools with time or space constraints, pre-prepared meal options could be offered for students to pick up and consume during lunch periods.

### 3. **Key Stakeholders and Their Roles**

- **School administration**: School principals and administrative staff need to be informed about new processes or changes in how meals are distributed.
- **Teachers**: Teachers, particularly those supervising meal times, should be briefed to help monitor and support the students’ meal experience.
- **Catering suppliers**: The suppliers should be aware of any changes in dietary requirements, volume adjustments, and timelines to accommodate shifts in demand.
- **Nutritionists and dietitians**: Consulting with these professionals can ensure that the meals meet dietary standards and cater to specific health needs of students.

### 4. **Data Ownership and Access**

- **Local council databases**: The London Borough of Hackney may have existing records on children eligible for free school meals. Collaborating with the data management department is essential to access this information.
- **School enrolment data**: Schools themselves might maintain records that indicate eligibility and contact information for parents/guardians.
- **Public health records**: Data from public health departments might provide insights into dietary requirements and allergy considerations relevant to specific schools or areas.
- **Parents/Guardians**: Collecting data directly from parents is necessary for dietary restrictions, religious requirements, and other specific needs of the children.

### 5. **Engaging with Parents for Dietary Requirements and Needs**

- **Online surveys and forms**: Develop user-friendly, secure online forms for parents to fill out detailing their children's dietary needs, allergies, and preferences.
- **School meetings and workshops**: Host sessions either in person or virtually to inform parents about the free school meal programme and discuss how they can submit their children's dietary requirements.
- **Direct communication**: Use emails, text messages, and school apps to remind parents to submit relevant information.
- **Feedback mechanisms**: Establish an ongoing feedback loop where parents can report on the adequacy and quality of the meals provided and suggest adjustments based on their children's needs.

### 6. **Additional Considerations**

- **Privacy and data security**: Ensure that all data collected from parents and schools is handled according to data protection laws and policies, safeguarding children's personal information.
- **Training for staff**: Ensure that school staff, especially those involved in meal distribution and student interaction, are trained on dietary and allergy protocols.
- **Meal quality checks**: Regularly monitor the quality of meals provided to ensure they meet nutritional standards and are well-received by students.
- **Communications strategy**: Develop clear communication materials for parents, schools, and catering partners to outline the processes, the benefits of the programme, and any updates or changes.

### 7. **Final Goal**

The goal is to build a streamlined and well-communicated approach that ensures every child entitled to free school meals has reliable access to nutritious, appropriate food options. This requires coordination between various stakeholders, continuous monitoring, and an emphasis on transparency and engagement with the families involved.

## Proposed action plan

```mermaid
graph TD
    A[Start: Head of Local Education identifies the need] --> B[Engage with Local Council for Data Access]
    B --> C[Access School Enrollment Data]
    B --> D[Consult Public Health Records for Allergy Information]
    C --> E[Notify School Administration about Initiative]
    D --> E
    E --> F[Brief Teachers on Monitoring Responsibilities]
    E --> G[Inform Catering Suppliers about New Requirements]
    G --> H[Collaborate with Nutritionists for Dietary Planning]
    H --> I[Set Up Online Forms for Parents]
    I --> J[Collect Dietary Requirements and Needs from Parents]
    J --> K[Analyse Data for Meal Planning]
    K --> L[Share Updated Requirements with Catering Suppliers]
    L --> M[Train School Staff on Protocols]
    M --> N[Start Providing Meals at Schools]
    N --> O[Monitor Meal Distribution and Quality]
    O --> P[Collect Feedback from Parents and Teachers]
    P --> Q[Adjust Meal Plans as Needed]
    Q --> R[Continuous Monitoring and Communication]
    R --> S[End: Successful Implementation of Meal Programme]
```

{{ govukRadios({
  name: "contact",
  fieldset: {
    legend: {
      text: "Is this right?",
      isPageHeading: true
    }
  },
  items: [
    {
      text: "Yes",
      checked: true,
      disabled: true
    },
    {
      text: "No",
      disabled: true
    }
  ]
}) }}

{{ govukButton({
  text: "Create a bill of materials",
  href: "/begin/review-bill-of-materials"
}) }}
