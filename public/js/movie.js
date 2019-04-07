$(document).ready(function () {
    const dp = new DPlayer({
        container: document.getElementById('dplayer'),
        video: {
            url: '/videos/' + $('#videoId').val() + '/index.m3u8',
            type: 'mp4',
            customType: {
                'mp4': function (video, player) {
                    const hls = new Hls();
                    hls.loadSource(video.src);
                    hls.attachMedia(video);
                }
            }
        }
    });
});
