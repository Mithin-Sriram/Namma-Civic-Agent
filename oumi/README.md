# Oumi Fine-tuning for Namma-Civic-Agent

Fine-tuned model specifically for Indian civic queries and government scheme information.

## Setup

```bash
pip install oumi[gpu]
```

## Fine-tune Model

```bash
oumi train -c oumi/config.yaml
```

## Dataset

The dataset (`dataset.json`) contains 10 civic Q&A examples covering:
- Government schemes (PM-KISAN, Ayushman Bharat, MGNREGA)
- Document requirements
- Application processes
- Eligibility criteria
- RTI procedures

## Usage

After fine-tuning, the model can be used for:
- More accurate civic query responses
- Better understanding of Indian government terminology
- Improved eligibility reasoning
- Domain-specific document generation

## Integration

The fine-tuned model can be integrated into Namma-Civic-Agent by:
1. Deploying the model endpoint
2. Updating `lib/ai/service.ts` to use the fine-tuned model
3. Using it for specialized civic queries
