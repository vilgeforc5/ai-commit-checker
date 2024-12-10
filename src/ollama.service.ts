import {Message, Ollama} from 'ollama';

export enum EnumReasonSeverity {
	NONE = 'NONE',
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
}

const severityToHigherMap: Record<EnumReasonSeverity, EnumReasonSeverity[]> = {
	[EnumReasonSeverity.HIGH]: [EnumReasonSeverity.HIGH],
	[EnumReasonSeverity.MEDIUM]: [EnumReasonSeverity.MEDIUM, EnumReasonSeverity.HIGH],
	[EnumReasonSeverity.LOW]: [EnumReasonSeverity.LOW, EnumReasonSeverity.MEDIUM, EnumReasonSeverity.HIGH],
	[EnumReasonSeverity.NONE]: [
		EnumReasonSeverity.NONE,
		EnumReasonSeverity.LOW,
		EnumReasonSeverity.MEDIUM,
		EnumReasonSeverity.HIGH,
	],
};

export const isSeverityHigher = (target: EnumReasonSeverity, comparedTo: EnumReasonSeverity) =>
	severityToHigherMap[comparedTo].includes(target);

const initialMessage: Message = {
	role: 'assistant',
	content: `
		You are a code reviewer tasked with analyzing a diff for potentially malicious code injections, backdoors, or other security vulnerabilities.  You will receive a diff representing changes made to a file.  Your goal is to identify suspicious patterns and assess the risk they pose.
		
		Focus your analysis on the following potential security issues:
		
		* **Code Injection:** Look for the introduction of unsanitized user inputs into executable contexts (e.g., SQL queries, command execution, script evaluation).
		* **Backdoors:** Identify any code that could allow unauthorized access or control, such as hardcoded credentials, hidden accounts, or undocumented remote access capabilities.
		* **Trojans/Malware:** Detect code designed to perform malicious actions, such as data exfiltration, system disruption, or propagation to other systems.
		* **Logic Bombs:** Look for code designed to trigger malicious actions under specific conditions or after a certain time delay.
		* **Privilege Escalation:** Identify attempts to gain higher-level system privileges without proper authorization.
		
		Your response should be a JSON object. If you detect potentially malicious changes, return (IN FORMAT AVAILABLE FOR JSON.parse(...)):

		{"reason": "<A DETAILED EXPLANATION OF THE SUSPICIOUS CHANGE, INCLUDING THE TYPE OF VULNERABILITY (e.g., Code Injection), THE LOCATION IN THE DIFF, AND THE POTENTIAL IMPACT>","severity": "<NONE, LOW, MEDIUM, or HIGH based on the potential impact of the vulnerability>"}`,
};

export class OllamaService {
	constructor(private readonly model: string, private readonly ollama: Ollama) {}

	async sendRequestFile(content: string) {
		return this.ollama.chat({
			model: this.model,
			messages: [
				initialMessage,
				{
					role: 'user',
					content,
				},
			],
			options: {
				num_ctx: content.length * 2,
			},
		});
	}
}
