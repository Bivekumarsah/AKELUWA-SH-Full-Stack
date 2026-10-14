import { ChevronDown } from "lucide-react";

const deliverySteps = [
  {
    title: "Understand the problem",
    description: "We discuss your users, existing systems and constraints before recommending a solution.",
    output: "Requirements and project scope",
    details: ["Your goals, users and existing workflows", "Priorities, constraints and project ownership", "An agreed scope and acceptance criteria"],
  },
  {
    title: "Design and build",
    description: "We agree on milestones, develop in stages and review working software with your team.",
    output: "Working software and regular reviews",
    details: ["Design and technical decisions to review", "Working software at agreed milestones", "Feedback and changes tracked against the scope"],
  },
  {
    title: "Test and deliver",
    description: "We verify the agreed requirements and prepare your team to operate the system.",
    output: "Deployment, documentation and handover",
    details: ["Testing against the acceptance criteria", "Deployment and operating documentation", "Handover and an agreed plan for ongoing support"],
  },
];

export function DeliveryProcess() {
  return <ol className="company-process">{deliverySteps.map((step, index) => (
    <li key={step.title}>
      <span className="company-step">{String(index + 1).padStart(2, "0")}</span>
      <h3>{step.title}</h3>
      <p>{step.description}</p>
      <div className="company-process-output"><span>What you receive</span><strong>{step.output}</strong></div>
      <details><summary>Inside this stage <ChevronDown size={16} aria-hidden="true" /></summary><ul>{step.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></details>
    </li>
  ))}</ol>;
}
