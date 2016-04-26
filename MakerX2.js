(function(ext){
	var device = null;
	var rawData = null;
	var notifyConnection = false;
	 
	var active = true;
	var comWatchdog = null;
	var comPoller = null;
	 
	var valS1 = 0, idS1 = 0, selectedSensorS1 = 0;
	var valS2 = 0, idS2 = 0, selectedSensorS2 = 0;
	var valS3 = 0, idS3 = 0, selectedSensorS3 = 0;
	var valS4 = 0, idS4 = 0, selectedSensorS4 = 0;
	
	var eventS1Active = false, eventS2Active = false, eventS3Active = false, eventS4Active = false;
	var eventS1Type = 0, eventS2Type = 0, eventS3Type = 0, eventS4Type = 0;
	var eventS1Value = 0, eventS2Value = 0, eventS3Value = 0, eventS4Value = 0;
	
	var portsValues = new Uint16Array(22);
	 
	ext.resetAll = function(){}
	
	//Connecting a sensor to a port
	ext.connectSensor = function(sensor, port){
		switch(port){
			case 'S1':
				selectedSensorS1 = sensor;
				break;
			case 'S2':
				selectedSensorS2 = sensor;
				break;
			case 'S3':
				selectedSensorS3 = sensor;
				break;
			case 'S4':
				selectedSensorS4 = sensor;
				break;
		}
	}
	
	//Turn on/off the actuator
	ext.setActuator = function(option, port){
		var setMessage = new Uint8Array(5);
		setMessage[0] = 77; //M
		setMessage[3] = 50; //2
		setMessage[4] = 13; //\r
		
		switch(option){
			//On
			case menus['onoff'][0]:
				setMessage[1] = 87; //W
				break;
			//Off
			case menus['onoff'][1]:
				setMessage[1] = 119; //w
				break;
		}
		
		switch(port){
			case menus['ports'][0]:
				setMessage[2] = 49; //1
				break;
			case menus['ports'][1]:
				setMessage[2] = 50; //2
				break;
			case menus['ports'][2]:
				setMessage[2] = 51; //3
				break;
			case menus['ports'][3]:
				setMessage[2] = 52; //4
				break;
		}
		
		device.send(setMessage.buffer);
	}
	
	//Read the port, automatically convert the value using the selected sensor
	ext.readPort = function(port){
		var retVal, selectedSensor;
		
		switch(port){
			case 'S1':
		 		retVal = valS1;
		 		selectedSensor = selectedSensorS1;
				break;
			case 'S2':
		 		retVal = valS2;
		 		selectedSensor = selectedSensorS2;
				break;
			case 'S3':
		 		retVal = valS3;
		 		selectedSensor = selectedSensorS3;
				break;
			case 'S4':
		 		retVal = valS4;
		 		selectedSensor = selectedSensorS4;
	 			break;
	 	}
	 	
	 	//'Contato', 'Proximidade', 'Faixa', 'Cor', 'Luz (Lux)', 'Som (dB)', 'Temperatura (°C)',
		//'Resistência (Ohm)', 'Tensão (V)', 'Distância (cm)', 'Distância Sharp (cm)'
	 	switch(selectedSensor){
	 		//Digital
		 	case menus['sensors'][0]:
		 	case menus['sensors'][1]:
		 	case menus['sensors'][2]:
		 		return retVal
		 	//Color
		 	case menus['sensors'][3]:
		 		return convertToColor(retVal);
		 	//Light
		 	case menus['sensors'][4]:
		 		return convertToLux(retVal);
		 	//Sound
		 	case menus['sensors'][5]:
		 		return convertToDb(retVal);
		 	//Temperature
		 	case menus['sensors'][6]:
		 		return convertToCelsius(retVal);
		 	//Resistance
		 	case menus['sensors'][7]:
		 		return convertToOhm(retVal);
		 	//Voltage
		 	case menus['sensors'][8]:
		 		return convertToVolts(retVal);
		 	//Distance
		 	case menus['sensors'][9]:
		 		return convertToCentimeters(retVal);
		 	//Distance Sharp
		 	case menus['sensors'][10]:
		 		return convertToCentimetersSharp(retVal);
		 	default:
		 		return retVal;
	 	}
	}
	
	//Returns a color to use when comparing
	ext.getColor = function(color){
		return color;
	}
	
	ext.setEvent = function(option, port, type, value){
		//Enable
		if(option == menus['eventOptions'][0]){
			switch(port){
				case menus['ports'][0]:
					eventS1Active = true;
					eventS1Type = type;
					eventS1Value = value;
					break;
				case menus['ports'][1]:
					eventS2Active = true;
					eventS2Type = type;
					eventS2Value = value;
					break;
				case menus['ports'][2]:
					eventS3Active = true;
					eventS3Type = type;
					eventS3Value = value;
					break;
				case menus['ports'][3]:
					eventS4Active = true;
					eventS4Type = type;
					eventS4Value = value;
					break;
			}
		}
		else{
			switch(port){
				case menus['ports'][0]:
					eventS1Active = false;
					break;
				case menus['ports'][1]:
					eventS2Active = false;
					break;
				case menus['ports'][2]:
					eventS3Active = false;
					break;
				case menus['ports'][3]:
					eventS4Active = false;
					break;
			}
		}
	}
	
	ext.event = function(port){
		var value = ext.readPort(port);
		var eventActive, eventType, eventValue;
		
		switch(port){
			case menus['ports'][0]:
				eventActive = eventS1Active;
				eventType = eventS1Type;
				eventValue = eventS1Value;
				break;
			case menus['ports'][1]:
				eventActive = eventS2Active;
				eventType = eventS2Type;
				eventValue = eventS2Value;
				break;
			case menus['ports'][2]:
				eventActive = eventS3Active;
				eventType = eventS3Type;
				eventValue = eventS3Value;
				break;
			case menus['ports'][3]:
				eventActive = eventS4Active;
				eventType = eventS4Type;
				eventValue = eventS4Value;
				break;
		}
		if(eventActive){
			if(eventType == menus['eventTypes'][0] && value < eventValue)
				return true;
			if(eventType == menus['eventTypes'][1] && value <= eventValue)
				return true;
			if(eventType == menus['eventTypes'][2] && value > eventValue)
				return true;
			if(eventType == menus['eventTypes'][3] && value >= eventValue)
				return true;
			if(eventType == menus['eventTypes'][4] && value == eventValue)
				return true;
			if(eventType == menus['eventTypes'][5] && value != eventValue)
				return true;
		}
		return false;
	}
	
	ext.setModeAnalog = function(port){
		if(port > 5)
			return;
			
		var setMessage = new Uint8Array(5);
		setMessage[0] = 77; //M
		setMessage[1] = 88; //X
		setMessage[3] = 97; //a
		setMessage[4] = 13; //\r
		
		port += 97;
		setMessage[2] = port;
		
		device.send(setMessage.buffer);
		printLog(setMessage);
	}
	
	ext.setModePorts = function(port, mode){
		if(port > 15)
			return;
		
		var setMessage = new Uint8Array(5);
		setMessage[0] = 77; //M
		setMessage[1] = 88; //X
		setMessage[4] = 13; //\r
		
		port += 103;
		setMessage[2] = port;
			
		switch(mode){
			//On
			case menus['pinModes'][0]:
				setMessage[3] = 100; //d
				break;
			//Off
			case menus['pinModes'][1]:
				setMessage[3] = 110; //n
				break;
		}
		
		device.send(setMessage.buffer);
		printLog(setMessage);
	}
	
	//Set or reset a pin
	ext.digitalWrite = function(status, port){
		if(port > 15)
			return;

		var setMessage = new Uint8Array(7);
		setMessage[0] = 77; //M
		setMessage[1] = 89; //Y
		setMessage[6] = 13; //\r
		
		port += 100;
		setMessage[4] = convertToHex((port & 0xF0) >> 4);
		setMessage[5] = convertToHex((port & 0x0F));
		
		switch(status){
			//On
			case menus['onoff'][0]:
				setMessage[2] = 67;
				setMessage[3] = 66;
				break;
			//Off
			case menus['onoff'][1]:
				setMessage[2] = 67;
				setMessage[3] = 65;
				break;
		}
		
		device.send(setMessage.buffer);
	}
	
	
	//Set or reset a pin
	ext.digitalRead = function(port){
		if(port > 15)
			return -1;
		return portsValues[port + 6];
	}
	
	//Set or reset a pin
	ext.analogRead = function(port){
		if(port > 5)
			return -1;
		return portsValues[port];
	}
	
	convertToHex = function(v){
		if(v < 10)
			return v + 48;
		return v + 65;
	}
	
	//Control the servos angle
	ext.setServo = function(servo, angle){
	 	var sendServo = new Uint8Array(7);
		sendServo[0] = 77; //M
		sendServo[2] = 13; //\r
		sendServo[6] = 13; //\r
		
		if(angle < 0)
			angle = 0;
		if(angle > 180)
			angle = 180;
		sendServo[3] = angle / 100 + 48;
		sendServo[4] = (angle % 100) / 10 + 48;
		sendServo[5] = angle % 10 + 48;
		
		if(servo == menus['servo'][0])
			sendServo[1] = 111; //o
		if(servo == menus['servo'][1])
			sendServo[1] = 112; //p
			
		device.send(sendServo.buffer);
	}
	
	//Control the motors direction and power
	ext.setMotor = function(motor, direction, power){
	 	var sendMotor = new Uint8Array(7);
		sendMotor[0] = 77; //M
		sendMotor[2] = 13; //\r
		sendMotor[6] = 13; //\r
			
		if(power < 0)
			power = 0;
		if(power > 100)
			power = 100;
		if(direction == menus['directions'][1])
			power = power + 128;
		if(direction == menus['directions'][2])
			power = 0;
		sendMotor[3] = power / 100 + 48;
		sendMotor[4] = (power % 100) / 10 + 48;
		sendMotor[5] = power % 10 + 48;
			
		if(motor == menus['motor'][0])
			sendMotor[1] = 101 //e
		if(motor == menus['motor'][1])
			sendMotor[1] = 100 //d
		
		device.send(sendMotor.buffer);
	}
	
	//Play a note for certain amount of time
	ext.playNoteTime = function(note, time, callback){
		ext.playNote(note);
		window.setTimeout(function(){
			ext.mute();
			callback();
		}, time*1000);
	}
	
	//Play a note
	ext.playNote = function(note){
		var sendSound = new Uint8Array(7);
		sendSound[0] = 77; //M
		sendSound[1] = 77; //M
		sendSound[2] = 13; //\r
		sendSound[6] = 13; //\r
		
		var value;
		
		switch(note){
			case menus['notes'][0]:
				value = 118;
				break;
			case menus['notes'][1]:
				value = 112;
				break;
			case menus['notes'][2]:
				value = 105;
				break;
			case menus['notes'][3]:
				value = 99;
				break;
			case menus['notes'][4]:
				value = 94;
				break;
			case menus['notes'][5]:
				value = 88;
				break;
			case menus['notes'][6]:
				value = 83;
				break;
			case menus['notes'][7]:
				value = 79;
				break;
			case menus['notes'][8]:
				value = 74;
				break;
			case menus['notes'][9]:
				value = 70;
				break;
			case menus['notes'][10]:
				value = 66;
				break;
			case menus['notes'][11]:
				value = 62;
				break;
			default:
				value = 118
		}
			
		sendSound[3] = value / 100 + 48;
		sendSound[4] = (value % 100) / 10 + 48;
		sendSound[5] = value % 10 + 48;
		
		device.send(sendSound.buffer);
	}
	
	//Mute the device
	ext.mute = function(){
		var sendMute = new Uint8Array(3);
		sendMute[0] = 77; //M
		sendMute[1] = 109; //m
		sendMute[2] = 13; //\r
		
		device.send(sendMute.buffer);
	}
	
	//Convertion functions
	
	//Convert the value to a color
	function convertToColor(val){
		//'Blue', 'Red', 'Yellow', 'Green', 'White', 'Black', 'Undefined'
		if(val <= 160)
			return menus['colors'][0];
		if(val > 160 && val <= 328)
			return menus['colors'][1];
		if(val > 328 && val <= 460)
			return menus['colors'][2];
		if(val > 460 && val <= 608)
			return menus['colors'][3];
		if(val > 608 && val <= 788)
			return menus['colors'][4];
		if(val > 788 && val <= 908)
			return menus['colors'][5];
		if(val > 908)
			return menus['colors'][6];
	}
	
	//Convert the value to Ohms
	function convertToOhm(val){
		if(val < 10)
			val = 0;
		if(val > 1012)
			val = 1023;
		return Math.round(100000 * (1023 - val) / val);
	}
	
	//Convert the value to degrees Celcius
	function convertToCelsius(val){
		return Math.round((3970 / (Math.log(-(110 / 111 * (val - 1023)) / val) + 3970 / 298.15)) - 273.15);
	}
	
	//Convert the value to Volts
	function convertToVolts(val){
		return Math.round((6.47959 - (val * 5 / 294)) * 10) / 10;
	}
	
	//Convert the value to Lux
	function convertToLux(val){
		return Math.round(50 * val / (2700000 / 127 *0.00076725)) / 10;
	}
	
	//Convert the value to dB
	function convertToDb(val){
		return Math.round(10 * ((0.0491 * val) + 40)) / 10;
	}
	
	//Convert the value to cm
	function convertToCentimeters(val){
		return Math.round(val * 0.2);
	}
	
	function convertToCentimetersSharp(val){
		if(val < 85)
			val = 85;
		return Math.round (1 / (0.000225194 * val - 0.0077244));
	}

	//************************************************************* 
	
	function printLog(msg){
		console.log(String.fromCharCode.apply(null, msg));
	}
	
	function appendBuffer(buffer1, buffer2){
		var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
		tmp.set(new Uint8Array(buffer1), 0);
		tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
		return tmp.buffer;
	}
	
	var potentialDevices = [];
	ext._deviceConnected = function(dev){
		potentialDevices.push(dev);
		if(!device){
			tryNextDevice();
		}
	}

	function checkMaker(bytes){
		var data = String.fromCharCode.apply(null, bytes);
		console.log('Data: ' + data);
		var t_index = data.indexOf('t');
		var l_index = data.indexOf('l');
		if(t_index >= 0 && l_index >= 0){
			t_index ++;
			l_index ++;
			var kernelVersion = data.substring(t_index, t_index + 4);
			var legalVersion = data.substring(l_index, l_index + 4);

			console.log('Kernel: ' + kernelVersion);
			console.log('Legal: ' + legalVersion);

			if(kernelVersion >= 106 && legalVersion >= 108){
				notifyConnection = true;
				return true;
			}
		}
		return false;
	}
	
	//Process the data
	function processData(){
		var bytes = new Uint8Array(rawData);
		
		if(watchdog){
			//If recognized as being an ALPHA Maker
			if(checkMaker(bytes)){
				rawData = null;
				
				//Stop the timers
				clearTimeout(watchdog);
				watchdog = null;
				clearInterval(poller);
				poller = null;
				
				//Start the data acquisition
				var startAcquisition = new Uint8Array(5);
				startAcquisition[0] = 77; //M
				startAcquisition[1] = 115; //s
				startAcquisition[2] = 49; //1
				startAcquisition[3] = 48; //0
				startAcquisition[4] = 13; //\r
				
				console.log('Starting acquisition');
				device.send(startAcquisition.buffer);
				
				//Set a timer to request the data
				comPoller = setInterval(function(){
					var resend =new Uint8Array(3);
					resend[0] = 77; //M
					resend[1] = 86; //V
					resend[2] = 13; //\r
					device.send(resend.buffer);
				}, 1000);//50);
			
				//Set a timer to check if the connection is still active
				active = true;
				comWatchdog = setInterval(function(){
					if(active)
						active = false
					else{
						clearInterval(comPoller);
						comPoller = null;
						
						clearInterval(comWatchdog);
						comWatchdog = null;
						
						device.set_receive_handler(null);
						device.close();
						device = null;
						tryNextDevice();
					}
				}, 3000);
			}
		}
		
		//If is in acquisition mode
		if(comPoller && comWatchdog){
			//Decode the received message
			if(decodeMessage(bytes)){
				rawData = null;
				active = true;
			}
		}
	}
	
	//Decode the received message
	function decodeMessage(bytes){
	 	var data = String.fromCharCode.apply(null, bytes);
	 	
	 	if(data.indexOf('K') == -1)
	 		return false;
	 		
	 	console.log(data);
	 	
	 	//IDs
		var idS1_index = data.indexOf('A');
		var idS2_index = data.indexOf('B');
		var idS3_index = data.indexOf('C');
		var idS4_index = data.indexOf('D');
		//Values
		var valS1_index = data.indexOf('a');
		var valS2_index = data.indexOf('b');
		var valS3_index = data.indexOf('c');
		var valS4_index = data.indexOf('d');
		
		var index;
		
		idS1_index ++;
		idS2_index ++;
		idS3_index ++;
		idS4_index ++;
		
		valS1_index ++;
		valS2_index ++;
		valS3_index ++;
		valS4_index ++;
		
		//Get S1
		index = data.indexOf('\r', idS1_index);
		idS1 = data.substring(idS1_index, index);
		index = data.indexOf('\r', valS1_index);
		valS1 = data.substring(valS1_index, index);
		
		//Get S2
		index = data.indexOf('\r', idS2_index);
		idS2 = data.substring(idS2_index, index);
		index = data.indexOf('\r', valS2_index);
		valS2 = data.substring(valS2_index, index);
		
		//Get S3
		index = data.indexOf('\r', idS3_index);
		idS3 = data.substring(idS3_index, index);
		index = data.indexOf('\r', valS3_index);
		valS3 = data.substring(valS3_index, index);
		
		//Get S4
		index = data.indexOf('\r', idS4_index);
		idS4 = data.substring(idS4_index, index);
		index = data.indexOf('\r', valS4_index);
		valS4 = data.substring(valS4_index, index);
		
		while(true){
			var pIndex = data.indexOf('P', pIndex);
			if(pIndex == -1)
				break;
			var port = data.charCodeAt(++pIndex);
			console.log('Got: ' + port);
			port -= 97;
			console.log('Converted: ' + port);
			index = data.indexOf('\r', ++pIndex);
			portsValues[port] = data.substring(pIndex, index);
			console.log(portsValues[port]);
		}
		return true;
	}


	var poller = null;
	var watchdog = null;
	function tryNextDevice(){
		//If potentialDevices is empty, device will be undefined.
		//That will get us back here next time a device is connected.
		device = potentialDevices.shift();
		if(!device)
			return;
		device.open({stopBits: 0, bitRate: 9600, ctsFlowControl: 0});
		
		device.set_receive_handler(function(data){
			if(!rawData)
				rawData = new Uint8Array(data);
			else
				rawData = appendBuffer(rawData, data);

			processData();
		});

		//Envia Mn
		var getDeviceInformation = new Uint8Array(3);
		getDeviceInformation[0]= 77; //M;
		getDeviceInformation[1]= 110; //n;
		getDeviceInformation[2] = 13; //\r
		poller = setTimeout(function(){
			console.log('Sending Mn');
			device.send(getDeviceInformation.buffer);
		}, 500);
		
		watchdog = setTimeout(function(){
			console.log('Watchdog triggered');
			//This device didn't get good data in time, so give up on it. Clean up and then move on.
			//If we get good data then we'll terminate this watchdog.
			clearInterval(poller);
			poller = null;
			device.set_receive_handler(null);
			device.close();
			device = null;
			tryNextDevice();
		}, 5000);
	}

	 //*************************************************************
	ext._deviceRemoved = function(dev){
		console.log('_deviceRemoved');
		if(device != dev)
			return;
		if(poller)
			poller = clearInterval(poller);
		if(comPoller)
			comPoller = clearInterval(comPoller);
		if(comWatchdog)
			comWatchdog = clearInterval(comWatchdog);
		device = null;
		notifyConnection = false;
	}

	ext._shutdown = function(){
		if(device){
		 	var sendFinish = new Uint8Array(3);
			sendFinish[0] = 77; //M
		 	sendFinish[1] = 102; //f
			sendFinish[2] = 13; //\r
			device.send(sendFinish.buffer);
		
			device.close();
		}
		if(poller)
			poller = clearInterval(poller);
		if(comPoller)
			comPoller = clearInterval(comPoller);
		if(comWatchdog)
			comWatchdog = clearInterval(comWatchdog);
		device = null;
	}

	ext._getStatus = function(){
		if(!device)
			return{status: 0, msg: 'Maker disconnected'};
		if(watchdog)
			return{status: 1, msg: 'Searching for Maker'};
		return{status: 2, msg: 'Maker connected'};
	}
	
	//************************************************************
	//Block and block menu descriptions
	var blocks = [
		[' ', 'Conectar sensor de %m.sensors na porta %m.ports', 'connectSensor', ' ', 'S1'],
		[' ', '%m.onoff cabo de luz na porta %m.ports', 'setActuator', 'Ligar', 'S1'],
		['r', 'Ler porta %m.ports', 'readPort', 'S1'],
		['r', 'Cor %m.colors', 'getColor', 'Azul'],
		['-'],
		[' ', '%m.eventOptions evento %m.ports %m.eventTypes %s', 'setEvent', 'Habilite', 'S1', '=', '0'],
		['h', 'Evento %m.ports', 'event', 'S1'],
		['-'],
		[' ', 'Configurar A%n como entrada analógica', 'setModeAnalog', 0],
		[' ', 'Configurar P%n como %m.pinModes digital', 'setModePorts', 0, 'entrada'],
		[' ', '%m.onoff P%n', 'digitalWrite', 'Ligar', 0],
		['r', 'Ler P%n', 'digitalRead', 0],
		['r', 'Ler A%n', 'analogRead', 0],
		['-'],
		[' ', 'Servo %m.servo %n °', 'setServo', 'SV1', 0],
		[' ', 'Motor %m.motor %m.directions %n %', 'setMotor', 'ME', 'frente', 0],
		['-'],
		['w', 'Tocar nota %m.notes por %n segundos', 'playNoteTime', 'Dó', 1],
		[' ', 'Tocar nota %m.notes', 'playNote', 'Dó'],
		[' ', 'Mudo', 'mute']
	];
	
	var menus = {
		ports: ['S1', 'S2', 'S3', 'S4'],
		sensors: ['Contato', 'Proximidade', 'Faixa', 'Cor', 'Luz (Lux)', 'Som (dB)', 'Temperatura (°C)',
			'Resistência (Ohm)', 'Tensão (V)', 'Distância (cm)', 'Distância Sharp (cm)'],
		colors: ['Azul', 'Vermelha', 'Amarela', 'Verde', 'Branca', 'Preta', 'Indefinida'],
		eventOptions: ['Habilite', 'Desabilite'],
		onoff: ['Ligar', 'Desligar'],
		eventTypes: ['<', '<=', '>', '>=', '=', '!='],
		pinModes: ['entrada', 'saída'],
		servo: ['SV1', 'SV2'],
		motor: ['ME', 'MD'],
		directions: ['frente', 'ré', 'pare'],
		notes: ['Dó', 'Réb', 'Ré', 'Mib', 'Mi', 'Fá', 'Solb', 'Sol', 'Láb', 'Lá', 'Síb', 'Si']
	};
	var descriptor = {
		blocks: blocks,
		menus: menus
	};
	ScratchExtensions.register('ALPHA Maker', descriptor, ext,{type: 'serial'});
})({});
