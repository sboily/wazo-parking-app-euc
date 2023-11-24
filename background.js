import { App } from 'https://cdn.jsdelivr.net/npm/@wazo/euc-plugins-sdk@0.0.20/lib/esm/app.js';
import 'https://cdn.jsdelivr.net/npm/@wazo/sdk';

const app = new App();

// Need to be fixed on EUC SDK
Wazo.Websocket.ws.on('onmessage', payload => {
  const msg = JSON.parse(payload).data;
  switch(msg.name) {
    case "parking_parked_call":
    case "parking_unparked_call":
    case "parking_parked_call_give_up":
    case "parking_parked_call_swap":
    case "parking_parked_call_timeout":
    case "call_answered":
    case "call_updated":
    case "call_ended":
      app.sendMessageToIframe(msg);
      break;
  }
});

(async () => {
  await app.initialize();
  const context = app.getContext();

  console.log('parking background - background launched');
})();
