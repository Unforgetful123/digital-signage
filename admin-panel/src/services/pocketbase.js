import PocketBase from 'pocketbase';

const url = localStorage.getItem('server_url') || "https://postilioned-ema-nebulously.ngrok-free.dev";
const pb = new PocketBase(url);

// ADD THIS BLOCK TO BYPASS NGROK'S WARNING PAGE
pb.beforeSend = function (url, reqOpts) {
    reqOpts.headers = Object.assign({}, reqOpts.headers, {
        'ngrok-skip-browser-warning': 'true'
    });
    return { url, reqOpts };
};

export default pb;