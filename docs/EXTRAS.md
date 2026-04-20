# Optional: Demo Video & Presentation

The README and `docs/TECHNICAL.md` are the authoritative source of truth for judging. The video and slides below are supplementary — they exist to make the project easier to pitch, not easier to verify.

- **Demo video** — *(to be added — link goes here once recorded)*
  Link: 

- **Slide deck** — *(not planned — the docs serve this role. If requested for finalist round we'll add here.)*
  Link:

## Live artifacts that stand in for slides

If you want a fast overview without reading docs, these are the highest-signal links:

- **Contract on BscScan:** https://testnet.bscscan.com/address/0x3B933087c131B30a38fF9C85EE665209b7005751
- **Deployment tx:** https://testnet.bscscan.com/tx/0x00ed0de341b85a25702f2ece4b1f511bb2a05cf38cba699415391a8b77521adc
- **Repo:** https://github.com/sunrobert/chaindesk
- **Key files to skim (in order):**
  1. `src/LimitOrderBook.sol` — the whole protocol, ~200 lines
  2. `docs/PROJECT.md` — why we built it
  3. `docs/TECHNICAL.md` — how it's wired together
  4. `web/app/api/orderbook-read/route.ts` — the Claude Haiku synthesis route
  5. `web/components/BookLadder.tsx` — the public-book UI and execute-all logic
