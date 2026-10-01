# Architecture diagrams index

Maintain these diagrams as the design and implementation evolve:

| Diagram | Purpose |
| --- | --- |
| Product Architecture | Product boundary and Maximo relationship |
| [Component Architecture](component-architecture.md) | Active Node Intelligence, provider routing, and separate-window Investigation Report components |
| [Data Flow](data-flow.md) | Bounded filter discovery, record, analytics, AI, persistence, and contextual-report flows |
| [Analytical Architecture](analytical-architecture.md) | Evidence mapping, eight deterministic rules, and active-context findings |
| [Security Architecture](security-architecture.md) | Authorization before analytical evidence and baseline calculation |
| [AI Architecture](ai-architecture.md) | Minimal Context Pack, provider-independent gateway, grounding, and server-side credential boundary |
| [Deployment Architecture](deployment-architecture.md) | MAF target, future server-side AI integration, and credential boundary |
| [Development Architecture](development-architecture.md) | Synthetic-data local development, provider resolver, and authorized MAS validation |
| Relevant sequence diagrams | Key investigation and Node Intelligence interactions as implemented |
| [Real Maximo Adapter Readiness](real-maximo-adapter-readiness.md) | Contract readiness, responsibilities, gaps, and MAS-only validation |

The current local [Development Architecture diagram](development-architecture.md) records aggregate and filter discovery, record preview, investigation persistence, deterministic analytics, provider resolution, and Mock AI paths. The deployment diagram records the intended server-side credential boundary; it is not proof of MAS compatibility. The established target relationship is recorded in the [TDD](../tdd/README.md).
