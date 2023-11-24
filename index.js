import { App } from 'https://cdn.jsdelivr.net/npm/@wazo/euc-plugins-sdk@0.0.20/lib/esm/app.js';

let url;
let session;
let parkingLotList = [];
let counters = {};

const app = new App();

const parkingList = document.getElementById('parking');
const activitiesList = document.getElementById('activities');

const emptyCallsRow = '<tr id="nocalls"><td colspan="6">No calls found.</td></tr>';
const emptyParkedCallsRow = '<tr id="noparkedcalls"><td colspan="7">No parked calls found.</td></tr>';

app.onIframeMessage = (msg) => {
  switch(msg.name) {
    case "parking_parked_call":
      addCallInParking(msg);
      break;
    case "parking_unparked_call":
      removeCallInParking(msg);
      break;
    case "parking_parked_call_give_up":
      removeCallInParking(msg);
      break;
    case "parking_parked_call_swap":
      console.log('SWAP !!!');
      break;
    case "parking_parked_call_timeout":
      removeCallInParking(msg);
      break;
    case "call_answered":
      addCall(msg);
      break;
    case "call_updated":
      updateCall(msg);
      break;
    case "call_ended":
      removeCall(msg);
      break;
  }
};

const getCallOnParking = (number) => {
  app.startCall({targets: [number], requestedModalities: ['audio']});
};

const updateCall = (payload) => {
  const call_id = payload.data.call_id;
  const conversation_id = payload.data.conversation_id;
  const talking_to_id = Object.keys(payload.data.talking_to);
  if (conversation_id == call_id) {
    setParkingBtn(call_id, talking_to_id); 
  };
};

const setParkingBtn = (call_id, talking_to_id) => {
  const btnParkCall = document.getElementById(`btn-park-${call_id}`);
  const selectParkCall = document.getElementById(`select-park-${call_id}`);
  if (btnParkCall) {
    btnParkCall.id = `btn-park-${talking_to_id}`;
    selectParkCall.id = `select-park-${talking_to_id}`;
    setEventParkingBtn(btnParkCall.id);
  };
};

const removeCall = (payload) => {
  const call_id = payload.data.call_id;
  const row = document.getElementById(call_id);
  if (row) {
    row.parentNode.removeChild(row);
  };

  const tbody = document.getElementById('currentCalls');
  if (tbody.rows.length === 0) {
    tbody.innerHTML = emptyCallsRow;
  };
};

const addCall = (payload) => {
  const participant = payload.data || payload;
  const currentCallsTableBody = document.getElementById('currentCalls');
  const park_call_id = participant.conversation_id;
  const emptyCallsRow = document.getElementById('nocalls');
  if (emptyCallsRow) {
    emptyCallsRow.parentNode.removeChild(emptyCallsRow);
  };

  let parkingOption;
  parkingLotList.map((park) => {
    parkingOption += `<option value=${park.asterisk_name}>${park.name}</option>`;
  });

  currentCallsTableBody.innerHTML += `
    <tr id=${participant.call_id}>
      <td>${participant.peer_caller_id_name || "-"}</td>
      <td>${participant.peer_caller_id_number}</td>
      <td class="mui-form--inline">
        <div class="mui-select">
          <select id="select-park-${park_call_id}">
            ${parkingOption}
          </select>
        </div>
        &nbsp;
        &nbsp;
        <button id="btn-park-${park_call_id}" class="mui-btn mui-btn--small mui-btn--accent">Park call</button>
      </td>
    </tr>
  `;

   setEventParkingBtn(park_call_id);

};

// Remove old eventListener
const setEventParkingBtn = (park_call_id) => {
  const btnParkCall = document.getElementById(`btn-park-${park_call_id}`);
  if (btnParkCall) {
    btnParkCall.addEventListener('click', async (event) => {
      const btnId = event.target.id;
      const parkCallId = btnId.split('-').pop();
      const parkingName = document.getElementById(`select-park-${parkCallId}`).value;
      await parkCall(parkingName, parkCallId);
    });
  };
};

const removeCallInParking = (payload) => {
  const participant = `park-${payload.data.parkee_uniqueid}`;
  const row = document.getElementById(participant);
  if (row) {
    row.parentNode.removeChild(row);
    stopCounter(`timeout-${payload.data.parkee_uniqueid}`);
    stopCounter(`duration-${payload.data.parkee_uniqueid}`);
  };

  const tbody = document.getElementById('currentParkedCalls');
  if (tbody.rows.length === 0) {
    tbody.innerHTML = emptyParkedCallsRow;
  };
};

const addCallInParking = (payload) => {
  const participant = payload.data || payload;
  const parkingTableBody = document.getElementById('currentParkedCalls');
  const emptyParkedCallsRow = document.getElementById('noparkedcalls');
  emptyParkedCallsRow.parentNode.removeChild(emptyParkedCallsRow);

  if (participant.parkee_uniqueid) {
    parkingTableBody.innerHTML += `
      <tr id=park-${participant.parkee_uniqueid}>
        <td><button id=unpark-${participant.parking_space} class="mui-btn mui-btn--small mui-btn--primary">${participant.parking_space}</button></td>
        <td>${participant.parkee_caller_id_name || '-'}</td>
        <td>${participant.parkee_caller_id_num}</td>
        <td>${participant.parkee_connected_line_name || '-'}</td>
        <td>${participant.parkee_connected_line_num}</td>
        <td id=duration-${participant.parkee_uniqueid}>${participant.parking_duration}</td>
        <td id=timeout-${participant.parkee_uniqueid}>${participant.parking_timeout}</td>
      </tr>
    `;

    startCounter(`timeout-${participant.parkee_uniqueid}`, participant.parking_timeout);
    startCounter(`duration-${participant.parkee_uniqueid}`, participant.parking_duration, false);

    const btnUnPark = document.getElementById(`unpark-${participant.parking_space}`);
    btnUnPark.addEventListener('click', (event) => {
        const btnId = event.target.id;
        const number = btnId.split('-').pop();
        getCallOnParking(number);
    });
  };
};

const getParkingList = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/parking`, options).then(response => response.json());
};

const getParkingCallList = async (parkingLot) => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/parking/${parkingLot}`, options).then(response => response.json());
};

const getCallsList = async () => {
  const options = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    }
  };

  return fetch(`https://${url}/api/calld/1.0/users/me/calls`, options).then(response => response.json());
};

const parkCall = async (parkingLot, call_id) => {
  const payload = {
    call_id: call_id
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': session.token
    },
    body: JSON.stringify(payload)
  };

  return fetch(`https://${url}/api/calld/1.0/parking/${parkingLot}`, options).then(response => response.json());
};

const displayCalls = (calls) => {
  if (calls.length) {
    calls.map((call) => {
      addCall(call);
    });
  };
};

const displayParking = (parking) => {
  let tableRows = '<tr><td colspan="5">No parking found.</td></tr>';

  if (parking.length) {
    tableRows = parking
      .map(
        (park) => `
        <tr>
            <td><b>${park.name}</b></td>
            <td>${park.extensions[0].exten}</td>
            <td>${park.slots_start}</td>
            <td>${park.slots_end}</td>
            <td>${park.timeout}</td>
        </tr>
    `,
      )
      .join('');

    parking.map((park) => {
      parkingLotList.push({
        id: park.id,
        name: park.name,
        asterisk_name: `parkinglot-${park.id}`
      });
    });
  };

  parkingList.innerHTML = `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Name</th>
          <th>Extension</th>
          <th>Slot start</th>
          <th>Slot end</th>
          <th>TimeOut</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  activitiesList.innerHTML = `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Caller ID Name</th>
          <th>Caller ID Num</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="currentCalls">${emptyCallsRow}</tbody>
    </table>
  `;

  activitiesList.innerHTML += `
    <table class="mui-table mui-table--bordered">
      <thead>
        <tr>
          <th>Space</th>
          <th>Caller ID Name</th>
          <th>Caller ID Num</th>
          <th>Callee ID Name</th>
          <th>Callee ID Num</th>
          <th>Duration</th>
          <th>TimeOut</th>
        </tr>
      </thead>
      <tbody id="currentParkedCalls">${emptyParkedCallsRow}</tbody>
    </table>
  `;

  parking.map(async (park) => {
    const callParkRes = await getParkingCallList(`parkinglot-${park.id}`);
    if (callParkRes.length) {
      callParkRes.map((call) => {
        addCallInParking(call);
      });
    };
  });

};

const startCounter = (id, seconds, countdown = true) => {
  let counter = seconds;
  const displayCounter = document.getElementById(id);

  counters[id] = setInterval(() => {
    if (displayCounter) {
      displayCounter.innerHTML = counter;
    };
    countdown ? counter-- : counter++;

    if (countdown && counter < 0) {
      stopCounter(id);
    };
  }, 1000);
};

const stopCounter = (id) => {
  clearInterval(counters[id]);
  console.log(`Counter ${id} stopped.`);
  delete counters[id];
}

(async() => {
  await app.initialize();
  const context = app.getContext();
  session = context.user;
  url = context.user.host;

  const parkingRes = await getParkingList();
  const callsRes = await getCallsList();
  displayParking(parkingRes.items);
  displayCalls(callsRes.items);
})();
