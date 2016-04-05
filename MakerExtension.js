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
	 
	ext.resetAll = function(){}
	
	ext.connectSensor = function(sensor, port){
		if(port == 'S1'){
			selectedSensorS1 = sensor;
		}
		if(port == 'S2'){
			selectedSensorS2 = sensor;
		}
		if(port == 'S3'){
			selectedSensorS3 = sensor;
		}
		if(port == 'S4'){
			selectedSensorS4 = sensor;
		}
	}
	 
	ext.readPort = function(port){
		var retVal, selectedSensor;
	 	if(port == 'S1'){
	 		retVal = valS1;
	 		selectedSensor = selectedSensorS1;
	 	}
	 	if(port == 'S2'){
	 		retVal = valS2;
	 		selectedSensor = selectedSensorS2;
	 	}
	 	if(port == 'S3'){
	 		retVal = valS3;
	 		selectedSensor = selectedSensorS3;
	 	}
	 	if(port == 'S4'){
	 		retVal = valS4;
	 		selectedSensor = selectedSensorS4;
	 	}
	 	
	 	//['Digital', 'Color', 'Light', 'Sound', 'Temperature', 'Resistance', 'Voltage', 'Distance']
	 	//Digital
	 	if(selectedSensor == menus[lang]['sensors'][0])
	 		return retVal
	 	//Color
	 	if(selectedSensor == menus[lang]['sensors'][1])
	 		return convertToColor(retVal);
	 	//Light
	 	if(selectedSensor == menus[lang]['sensors'][2])
	 		return convertToLux(retVal);
	 	//Sound
	 	if(selectedSensor == menus[lang]['sensors'][3])
	 		return convertToDb(retVal);
	 	//Temperature
	 	if(selectedSensor == menus[lang]['sensors'][4])
	 		return convertToCelsius(retVal);
	 	//Resistance
	 	if(selectedSensor == menus[lang]['sensors'][5])
	 		return convertToOhm(retVal);
	 	//Voltage
	 	if(selectedSensor == menus[lang]['sensors'][6])
	 		return convertToVolts(retVal);
	 	//Distance
	 	if(selectedSensor == menus[lang]['sensors'][7])
	 		return convertToCentimeters(retVal);

	 	return retVal;
	}
	
	ext.getColor = function(color){
		return color;
	}
	 
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
		
		if(servo == 'SV1')
			sendServo[1] = 111; //o
		if(servo == 'SV2')
			sendServo[1] = 112; //p
			
		device.send(sendServo.buffer);
	}
	 
	ext.setMotor = function(motor, direction, power){
	 	var sendMotor = new Uint8Array(7);
		sendMotor[0] = 77; //M
		sendMotor[2] = 13; //\r
		sendMotor[6] = 13; //\r
			
		if(power < 0)
			power = 0;
		if(power > 100)
			power = 100;
		if(direction == menus[lang]['directions'][1])
			power = power + 128;
		if(direction == menus[lang]['directions'][2])
			power = 0;
		sendMotor[3] = power / 100 + 48;
		sendMotor[4] = (power % 100) / 10 + 48;
		sendMotor[5] = power % 10 + 48;
			
		if(motor == "ME")
			sendMotor[1] = 101 //e
		if(motor == "MD")
			sendMotor[1] = 100 //d
		
		device.send(sendMotor.buffer);
	}
		 
	ext.playNote = function(note){
		var sendSound = new Uint8Array(7);
		sendSound[0] = 77; //M
		sendSound[1] = 77; //M
		sendSound[2] = 13; //\r
		sendSound[6] = 13; //\r
		
		var frequency;
		
		if(note == menus[lang]['notes'][0])
			frequency = 118;
		if(note == menus[lang]['notes'][1])
			frequency = 112;
		if(note == menus[lang]['notes'][2])
			frequency = 105;
		if(note == menus[lang]['notes'][3])
			frequency = 99;
		if(note == menus[lang]['notes'][4])
			frequency = 94;
		if(note == menus[lang]['notes'][5])
			frequency = 88;
		if(note == menus[lang]['notes'][6])
			frequency = 83;
		if(note == menus[lang]['notes'][7])
			frequency = 79;
		if(note == menus[lang]['notes'][8])
			frequency = 74;
		if(note == menus[lang]['notes'][9])
			frequency = 70;
		if(note == menus[lang]['notes'][10])
			frequency = 66;
		if(note == menus[lang]['notes'][11])
			frequency = 62;
			
		sendSound[3] = frequency / 100 + 48;
		sendSound[4] = (frequency % 100) / 10 + 48;
		sendSound[5] = frequency % 10 + 48;
		
		device.send(sendSound.buffer);
	}
	
	ext.playNoteTime = function(note, time, callback){
		ext.playNote(note);
		window.setTimeout(function(){
			ext.mute();
			callback();
		}, time*1000);
	}
		 
	ext.mute = function(){
		var sendMute = new Uint8Array(3);
		sendMute[0] = 77; //M
		sendMute[1] = 109; //m
		sendMute[2] = 13; //\r
		
		device.send(sendMute.buffer);
	}
	
	function convertToColor(val){
		//'Blue', 'Red', 'Yellow', 'Green', 'White', 'Black', 'Undefined'
		if(val <= 160)
			return menus[lang]['colors'][0];
		if(val > 160 && val <= 328)
			return menus[lang]['colors'][1];
		if(val > 328 && val <= 460)
			return menus[lang]['colors'][2];
		if(val > 460 && val <= 608)
			return menus[lang]['colors'][3];
		if(val > 608 && val <= 788)
			return menus[lang]['colors'][4];
		if(val > 788 && val <= 908)
			return menus[lang]['colors'][5];
		if(val > 908)
			return menus[lang]['colors'][6];
	}
	
	function convertToOhm(val){
		if(val < 10)
			val = 0;
		if(val > 1012)
			val = 1023;
		return Math.round(100000 * (1023 - val) / val);
	}
	
	function convertToCelsius(val){
		return Math.round((3970 / (Math.log(-(110 / 111 * (val - 1023)) / val) + 3970 / 298.15)) - 273.15);
	}
		
	function convertToVolts(val){
		return Math.round((6.47959 - (val * 5 / 294)) * 10) / 10;
	}
	
	function convertToLux(val){
		return Math.round(50 * val / (2700000 / 127 *0.00076725)) / 10;
	}
	
	function convertToDb(val){
		return Math.round(10 * ((0.0491 * val) + 40)) / 10;
	}
	
	function convertToCentimeters(val){
		return Math.round(val * 0.2);
	}

	 //*************************************************************
	 
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
	
	var inputArray = [];
	function processData(){
		var bytes = new Uint8Array(rawData);
		
		if(watchdog){
			if(checkMaker(bytes)){
				rawData = null;
				
				//Reconhece como sendo uma Maker
				clearTimeout(watchdog);
				watchdog = null;
				clearInterval(poller);
				poller = null;
				
				if(!comPoller && !comWatchdog){
					var startAcquisition = new Uint8Array(5);
					startAcquisition[0] = 77; //M
					startAcquisition[1] = 115; //s
					startAcquisition[2] = 49; //1
					startAcquisition[3] = 48; //0
					startAcquisition[4] = 13; //\r
					
					console.log('Starting acquisition');
					device.send(startAcquisition.buffer);
						
					comPoller = setInterval(function(){
						var resend =new Uint8Array(3);
						resend[0] = 77; //M
						resend[1] = 86; //V
						resend[2] = 13; //\r
						device.send(resend.buffer);
					}, 100);
				
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
		}
		
		if(comPoller && comWatchdog){
			if(decodeMessage(bytes)){
				rawData = null;
				active = true;
			}
		}
	}
	 
	function decodeMessage(bytes){
	 	var data = String.fromCharCode.apply(null, bytes);
	 	//IDs
		var idS1_index = data.indexOf('A');
		var idS2_index = data.indexOf('B');
		var idS3_index = data.indexOf('C');
		var idS4_index = data.indexOf('D');
		
		var valS1_index = data.indexOf('a');
		var valS2_index = data.indexOf('b');
		var valS3_index = data.indexOf('c');
		var valS4_index = data.indexOf('d');
		if(idS1_index >= 0 && idS2_index >= 0 && idS3_index >= 0 && idS4_index >= 0 && valS1_index >= 0 && valS2_index >= 0 && valS3_index >= 0 && valS4_index >= 0){
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
		
			/*console.log('A: ' + idS1);
			console.log('B: ' + idS2);
			console.log('C: ' + idS3);
			console.log('D: ' + idS4);
			console.log('a: ' + valS1);
			console.log('b: ' + valS2);
			console.log('c: ' + valS3);
			console.log('d: ' + valS4);*/
			return true;
		}
		return false;
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

	var paramString = window.location.search.replace(/^\?|\/$/g, '');
	var vars = paramString.split("&");
	var lang = 'en';
	//Check for GET param 'lang'
	for (var i = 0; i < vars.length; i++){
		var pair = vars[i].split('=');
		if(pair.length > 1 && pair[0] == 'lang')
			lang = pair[1];
	}
	
	//************************************************************
	//Block and block menu descriptions
	var blocks = {
		en: [
			[' ', 'Connect %m.sensors to port %m.ports', 'connectSensor', 'Digital Sensor', 'S1'],
			['r', 'Read port %m.ports', 'readPort', 'S1'],
			['r', 'Clor %m.colors', 'getColor', 'Blue'],
			['-'],
			[' ', 'Servo %m.servo %n °', 'setServo', 'SV1', '0'],
			[' ', 'Motor %m.motor %m.directions %n %', 'setMotor', 'ME', 'forward', '0'],
			['-'],
			['w', 'Play note %m.notes for %n seconds', 'playNoteTime', 'C', '1'],
			[' ', 'Play note %m.notes', 'playNote', 'C'],
			[' ', 'Mute', 'mute']
		],
		pt: [
			[' ', 'Conectar %m.sensors na porta %m.ports', 'connectSensor', 'Sensor Digital', 'S1'],
			['r', 'Ler porta %m.ports', 'readPort', 'S1'],
			['r', 'Cor %m.colors', 'getColor', 'Azul'],
			['-'],
			[' ', 'Servo %m.servo %n °', 'setServo', 'SV1', '0'],
			[' ', 'Motor %m.motor %m.directions %n %', 'setMotor', 'ME', 'frente', '0'],
			['-'],
			['w', 'Tocar nota %m.notes por %n segundos', 'playNoteTime', 'Dó', '1'],
			[' ', 'Tocar nota %m.notes', 'playNote', 'Dó'],
			[' ', 'Mudo', 'mute']
		]
	};
	
	var menus = {
		en: {
			ports: ['S1', 'S2', 'S3', 'S4'],
			sensors: ['Digital Sensor', 'Color Sensor', 'Light Sensor (Lux)', 'Sound Sensor (dB)', 'Temperature Sensor (°C)', 'Resistance Sensor (Ohm)', 'Voltage Sensor (V)', 'Distance Sensor (cm)'],
			colors: ['Blue', 'Red', 'Yellow', 'Green', 'White', 'Black', 'Undefined'],
			servo: ['SV1', 'SV2'],
			motor: ['ME', 'MD'],
			directions: ['forward', 'backward', 'stop'],
			notes: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
		},
		pt: {
			ports: ['S1', 'S2', 'S3', 'S4'],
			sensors: ['Sensor Digital', 'Sensor de Cor', 'Sensor de Luz (Lux)', 'Sensor de Som (dB)', 'Sensor de Temperatura (°C)', 'Sensor de Resistência (Ohm)', 'Sensor de Tensão (V)', 'Sensor de Distância (cm)'],
			colors: ['Azul', 'Vermelha', 'Amarela', 'Verde', 'Branca', 'Preta', 'Indefinida'],
			servo: ['SV1', 'SV2'],
			motor: ['ME', 'MD'],
			directions: ['frente', 'ré', 'pare'],
			notes: ['Dó', 'Réb', 'Ré', 'Mib', 'Mi', 'Fá', 'Solb', 'Sol', 'Láb', 'Lá', 'Síb', 'Si']
		}
	};
	var descriptor = {
		blocks: blocks[lang],
		menus: menus[lang]
	};
	ScratchExtensions.register('ALPHA Maker', descriptor, ext,{type: 'serial'});
})({});
