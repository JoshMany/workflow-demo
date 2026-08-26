import { MarkerType } from "@xyflow/react";
import type { WorkflowItemType } from "@/components/workflow/types";

export const initialWorkflowList: Record<string, WorkflowItemType> = {
	"0": {
		name: "Default Workflow",

		Nodes: [
			{
				id: "application-received",
				position: { x: 0, y: 0 },
				type: "actionNode",
				data: {
					actionTitle: "Notify Hiring Team",
					actionType: "internal_notification",
					actionUUID: "action-001",
					config: {
						body: "A new applicant has submitted an application and is ready for initial screening.",
					},
				},
			},

			{
				id: "application-confirmation",
				position: { x: 0, y: 150 },
				type: "actionNode",
				data: {
					actionTitle: "Send Application Confirmation",
					actionType: "email",
					actionUUID: "action-002",
					config: {
						subject: "Application Received",
						recipient: {
							type: "candidate",
						},
						body: `
                            Hello,

                            Thank you for your interest in joining our team.

                            We have received your application and will review your information shortly.

                            Best regards,
                            Recruiting Team
                        `,
					},
				},
			},

			{
				id: "screening-questionnaire",
				position: { x: 0, y: 300 },
				type: "actionNode",
				data: {
					actionTitle: "Send Screening Questionnaire",
					actionType: "questionnaire",
					actionUUID: "action-003",
					config: {
						questionnaireUUID: "questionnaire-screening",
					},
				},
			},

			{
				id: "questionnaire-evaluation",
				position: { x: 0, y: 450 },
				type: "actionNode",
				data: {
					actionTitle: "Evaluate Screening Results",
					actionType: "condition",
					actionUUID: "action-004",
					config: {
						condition:
							"Questionnaire score must be greater than or equal to 60%.",
					},
				},
			},

			{
				id: "questionnaire-rejected",
				position: { x: -300, y: 650 },
				type: "actionNode",
				data: {
					actionTitle: "Send Screening Rejection",
					actionType: "email",
					actionUUID: "action-005",
					config: {
						subject: "Application Update",
						recipient: {
							type: "candidate",
						},
						body: `
                            Hello,

                            Thank you for taking the time to complete our screening questionnaire.

                            After reviewing your responses, we will not be moving forward
                            with your application at this time.

                            We appreciate your interest and wish you the best.

                            Best regards,
                            Recruiting Team
                        `,
					},
				},
			},

			{
				id: "screening-approved-notification",
				position: { x: 300, y: 650 },
				type: "actionNode",
				data: {
					actionTitle: "Notify Team of Screening Approval",
					actionType: "internal_notification",
					actionUUID: "action-006",
					config: {
						body: "Applicant passed the initial screening questionnaire and can proceed to the interview stage.",
					},
				},
			},

			{
				id: "schedule-interview",
				position: { x: 300, y: 800 },
				type: "actionNode",
				data: {
					actionTitle: "Schedule Interview",
					actionType: "email",
					actionUUID: "action-007",
					config: {
						subject: "Interview Invitation",
						recipient: {
							type: "candidate",
						},
						body: `
                            Hello,

                            We would like to invite you to an interview.

                            Please select an available time using the scheduling link below.

                            Best regards,
                            Recruiting Team
                        `,
						trigger: { id: "trigger-interview-scheduled", type: "link_click" },
					},
				},
			},

			{
				id: "interview-guide",
				position: { x: 300, y: 950 },
				type: "actionNode",
				data: {
					actionTitle: "Prepare Interview",
					actionType: "interview",
					actionUUID: "action-008",
					config: {
						interviewer: "Hiring Manager",
						durationMinutes: 60,
						interviewType: "video",
					},
				},
			},

			{
				id: "interview-evaluation",
				position: { x: 300, y: 1100 },
				type: "actionNode",
				data: {
					actionTitle: "Review Interview Results",
					actionType: "manual_task",
					actionUUID: "action-009",
					config: {
						description:
							"Review the interview results and determine whether the applicant should proceed to the offer stage.",
						assignee: "Hiring Manager",
					},
				},
			},

			{
				id: "interview-decision",
				position: { x: 300, y: 1250 },
				type: "actionNode",
				data: {
					actionTitle: "Evaluate Interview Decision",
					actionType: "condition",
					actionUUID: "action-010",
					config: {
						condition:
							"Interview evaluation must recommend hiring the applicant.",
					},
				},
			},

			{
				id: "interview-rejected",
				position: { x: 0, y: 1450 },
				type: "actionNode",
				data: {
					actionTitle: "Send Interview Rejection",
					actionType: "email",
					actionUUID: "action-011",
					config: {
						subject: "Interview Follow-up",
						recipient: {
							type: "candidate",
						},
						body: `
                            Hello,

                            Thank you for taking the time to interview with us.

                            After careful consideration, we have decided not to
                            move forward with your application.

                            We appreciate your time and interest in the position.

                            Best regards,
                            Recruiting Team
                        `,
					},
				},
			},

			{
				id: "offer-notification",
				position: { x: 600, y: 1450 },
				type: "actionNode",
				data: {
					actionTitle: "Notify Team of Hiring Recommendation",
					actionType: "internal_notification",
					actionUUID: "action-012",
					config: {
						body: "The applicant passed the interview evaluation and is recommended for hire.",
					},
				},
			},

			{
				id: "send-offer",
				position: { x: 600, y: 1600 },
				type: "actionNode",
				data: {
					actionTitle: "Send Employment Offer",
					actionType: "email",
					actionUUID: "action-013",
					config: {
						subject: "Employment Offer",
						recipient: {
							type: "candidate",
						},
						body: `
                            Hello,

                            We are pleased to offer you the position.

                            Please review the attached offer details and use the
                            acceptance link to confirm your decision.

                            Best regards,
                            Recruiting Team
                        `,
						trigger: { id: "trigger-offer-response", type: "link_click" },
					},
				},
			},

			{
				id: "offer-accepted-notification",
				position: { x: 600, y: 1800 },
				type: "actionNode",
				data: {
					actionTitle: "Notify HR of Accepted Offer",
					actionType: "internal_notification",
					actionUUID: "action-014",
					config: {
						body: "The applicant has accepted the employment offer. Begin the onboarding process.",
					},
				},
			},

			{
				id: "offer-rejected",
				position: { x: 900, y: 1800 },
				type: "actionNode",
				data: {
					actionTitle: "Notify Team of Declined Offer",
					actionType: "internal_notification",
					actionUUID: "action-015",
					config: {
						body: "The applicant declined the employment offer.",
					},
				},
			},
		],

		Edges: [
			{
				id: "edge-001",
				source: "application-received",
				target: "application-confirmation",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "immediate",
					transitionUUID: "transition-001",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-002",
				source: "application-confirmation",
				target: "screening-questionnaire",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "time_delay",
					transitionUUID: "transition-002",
					delay: {
						amount: 1,
						unit: "days",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-003",
				source: "screening-questionnaire",
				target: "questionnaire-evaluation",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "event",
					transitionUUID: "transition-003",
					event: {
						triggerUUID: "trigger-questionnaire-submitted",
						description: "Questionnaire submitted by candidate",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-004",
				source: "questionnaire-evaluation",
				target: "screening-approved-notification",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "condition",
					transitionUUID: "transition-004",
					condition: {
						operator: "greater_than_or_equal",
						value: 60,
						description: "Questionnaire score >= 60%",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-005",
				source: "questionnaire-evaluation",
				target: "questionnaire-rejected",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "condition",
					transitionUUID: "transition-005",
					condition: {
						operator: "less_than",
						value: 60,
						description: "Questionnaire score < 60%",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-006",
				source: "screening-approved-notification",
				target: "schedule-interview",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "immediate",
					transitionUUID: "transition-006",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-007",
				source: "schedule-interview",
				target: "interview-guide",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "event",
					transitionUUID: "transition-007",
					event: {
						triggerUUID: "trigger-interview-scheduled",
						description: "Candidate scheduled an interview",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-008",
				source: "interview-guide",
				target: "interview-evaluation",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "time_delay",
					transitionUUID: "transition-008",
					delay: {
						amount: 1,
						unit: "days",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-009",
				source: "interview-evaluation",
				target: "interview-decision",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "immediate",
					transitionUUID: "transition-009",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-010",
				source: "interview-decision",
				target: "offer-notification",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "condition",
					transitionUUID: "transition-010",
					condition: {
						operator: "greater_than_or_equal",
						value: 1,
						description: "Interview evaluation recommends hiring",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-011",
				source: "interview-decision",
				target: "interview-rejected",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "condition",
					transitionUUID: "transition-011",
					condition: {
						operator: "less_than",
						value: 1,
						description: "Interview evaluation does not recommend hiring",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-012",
				source: "offer-notification",
				target: "send-offer",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "immediate",
					transitionUUID: "transition-012",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-013",
				source: "send-offer",
				target: "offer-accepted-notification",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "event",
					transitionUUID: "transition-013",
					event: {
						triggerUUID: "trigger-offer-response",
						description: "Candidate accepted the offer",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},

			{
				id: "edge-014",
				source: "send-offer",
				target: "offer-rejected",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "event",
					transitionUUID: "transition-014",
					event: {
						triggerUUID: "trigger-offer-decline",
						description: "Candidate declined the offer",
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			},
		],
	},
} satisfies Record<string, WorkflowItemType>;
