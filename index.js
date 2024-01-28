// https://github.com/aadsm/jsmediatags
var jsmediatags = window.jsmediatags;
/* pretty much set up
need to account for when current song changes through queueList
then make queueList appear and disssapear
then style
maybe directory support as folders? assuming i wanna kms
otherwise support folders by storing in localStorage or smth
*/
let queuePos = 0;
let playing = 1;
let musicFolder;
let music;
let audio;
let songs;
let queue = [];
const audioExtensions = [".mp3", ".wav", ".flac", ".aac", ".ogg", ".oga", ".m4a", ".wma", ".opus", ".alac"];
const endsWithAudioExtension = (str) => audioExtensions.some((ext) => str.endsWith(ext));
document.addEventListener("click", async (e) => {
	let target = e.target;
	let musicId;
	let targetId;

	if (endsWithAudioExtension(target.id)) {
		musicId = target.id;
	} else if (target.parentElement && endsWithAudioExtension(target.parentElement.id)) {
		musicId = target.parentElement.id;
	} else if (target.parentElement && parseInt(target.parentElement.id)) {
		targetId = target.parentElement.id;
	}
	if(targetId) {
		if(target.id == "removeSong") {
			queue.splice(targetId, 1);
			document.getElementById("queueList").children[targetId].remove();
		} else if(target.id == "moveUp") {
			if(targetId != 0) {
				queue = moveItem(queue, targetId - 1, targetId);
				let list = document.getElementById("queueList");
				list.insertBefore(list.children[targetId], list.children[targetId - 1]);
			}
		} else if(target.id == "moveDown") {
			if(targetId != queue.length - 1) {
				queue = moveItem(queue, targetId + 1, targetId);
				let list = document.getElementById("queueList");
				list.insertBefore(list.children[targetId + 1], list.children[targetId]);
			}
		}
	}
	if (musicId) {
		music = await musicFolder.getFileHandle(musicId);
		let file = await music.getFile();
		let url = URL.createObjectURL(file);
		audio = new Audio(url);
		let fileTags = await getTags(file);
		let data = [audio, fileTags.title, fileTags.artist, fileTags.picture];
		queue.push(data);
		let songElement = document.createElement("div");
		let list = document.getElementById("queueList");
		songElement.className = "song queueSong";
		songElement.id = queue.length - 1;
		songElement.innerHTML = `
		<img src="${data[3]}" />
		<div id="songText">
			<h1>${data[1]}</h1>
			<h2>${data[2]}</h2>
		</div>
		<button id="removeSong"></button>
		<button id="moveUp"></button>
		<button id="moveDown"></button>
		`;
		list.append(songElement);
	}
});
function handleMusic() {
	if (queue.length > queuePos) {
		let songTime = document.getElementById("songTime");
		if (queue[queuePos][0].currentTime == 0) {
			queue[queuePos][0].play();
			setSongClass();
		}
		songTime.value = (queue[queuePos][0].currentTime / queue[queuePos][0].duration) * 10000;
		document.getElementById("songName").innerHTML = queue[queuePos][1];
		document.getElementById("songArtist").innerHTML = queue[queuePos][2];
		document.getElementById("songCover").src = queue[queuePos][3];
		document.getElementById("currentSongPos").innerHTML = `${Math.floor(queue[queuePos][0].currentTime / 60)}:${Math.round(queue[queuePos][0].currentTime % 60)
			.toString()
			.padStart(2, 0)}`;
		document.getElementById("songLength").innerHTML = `${Math.floor(queue[queuePos][0].duration / 60)}:${Math.round(queue[queuePos][0].duration % 60)
			.toString()
			.padStart(2, 0)}`;
		if (queue[queuePos][0].ended) {
			changeSong(1);
		}
	}
}
async function getFolder() {
	if (typeof showDirectoryPicker == "function") {
		musicFolder = await showDirectoryPicker();
		document.getElementById("nomusic").style.display = "none";
		document.getElementById("songList").style.display = "block";
		document.getElementById("songStatus").style.display = "block";
		reloadData(musicFolder);
		document.getElementById("songTime").addEventListener("input", (e) => {
			console.log(e.target.value / queue[queuePos][0].duration);
			queue[queuePos][0].currentTime = (e.target.value * queue[queuePos][0].duration) / 10000;
		});
		let pause = document.getElementById("songPause");
		pause.addEventListener("click", (e) => {
			playing = !playing;
			if (playing) {
				queue[queuePos][0].play();
				setSongClass();
				pause.style.backgroundImage = "url('img/pause.svg')";
			} else {
				queue[queuePos][0].pause();
				pause.style.backgroundImage = "url('img/play.svg')";
			}
		});
		let next = document.getElementById("nextSong");
		next.addEventListener("click", (e) => {
			changeSong(1);
		});
		let prev = document.getElementById("prevSong");
		prev.addEventListener("click", (e) => {
			changeSong(-1);
		});
		setInterval(() => {
			handleMusic();
		}, 100);
	} else {
		alert("not supported");
	}
}

async function reloadData(folder, oldsongs = []) {
	songs = await getFiles(folder);
	if (JSON.stringify(songs) !== JSON.stringify(oldsongs)) {
		let songlist = document.getElementById("songList");
		songlist.innerHTML = "";
		for (let i = 0; i < songs.length; i++) {
			const song = songs[i];
			let songElement = document.createElement("div");
			songElement.className = "song";
			songElement.id = song[0];
			songElement.innerHTML = `
            <img src=${song[3]}>
            <h1>${song[1]}</h1>
            <h2>${song[2]}</h2>
            `;
			songlist.append(songElement);
		}
	}
	setTimeout(() => {
		reloadData(musicFolder, songs);
	}, 500);
}
async function getFiles(folder, prefix = "") {
	let files = [];
	for await (const file of folder.values()) {
		let fileHandle;
		if (file.kind === "file") {
			fileHandle = await file.getFile();
			let fileTags = await getTags(fileHandle);
			files.push([prefix + file.name, fileTags.title, fileTags.artist, fileTags.picture]);
		} else if (file.kind === "directory") {
			files = files.concat(await getFiles(file, prefix + file.name + "/"));
		}
	}
	files.sort((a, b) => a[1].localeCompare(b[1]));
	return files;
}

function createImage(data, format) {
	let base64String = "";
	for (let i = 0; i < data.length; i++) {
		base64String += String.fromCharCode(data[i]);
	}
	return `data:${format};base64,${window.btoa(base64String)}`;
}

async function getTags(file) {
	let fileTags = await new Promise((resolve, reject) => {
		jsmediatags.read(file, {
			onSuccess: function (data) {
				resolve(data.tags);
			},
			onError: function (error) {
				console.log(error);
				reject(error);
			},
		});
	});
	if (fileTags.picture) {
		fileTags.picture = createImage(fileTags.picture.data, fileTags.picture.format);
	} else {
		fileTags.picture = "img/blank.png";
	}

	if (!fileTags.title) {
		fileTags.title = file.name;
	}
	if (!fileTags.artist) {
		fileTags.artist = "N/A";
	}
	return fileTags;
}

async function changeSong(change) {
	if (queue.length > 0) {
		queue[queuePos][0].pause();
		queue[queuePos][0].currentTime = 0;
		queuePos += change;

		if (queuePos < 0) {
			queuePos = 0;
		} else if (queuePos >= queue.length) {
			queuePos = 0;
		}

		if (queue.length > queuePos) {
			await queue[queuePos][0].play();
		}

		document.getElementById("songPause").style.backgroundImage = "url('img/pause.svg')";
		playing = 1;
		setSongClass();
	}
}
function setSongClass() {
	for (let i = 0; i < document.getElementById("queueList").children.length; i++) {
		console.log(queuePos);
		console.log(i);
		console.log("does this fucking log??? jesus fucking christ");
		if (i.toString() == queuePos.toString()) {
			document.getElementById("queueList").children[i].className = "song queueSong playing";
		} else {
			document.getElementById("queueList").children[i].className = "song queueSong";
		}
	}
}

const moveItem = (array, to, from) => {
	const item = array[from];
	array.splice(from, 1);
	array.splice(to, 0, item);
	return array;
};
