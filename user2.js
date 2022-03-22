// Env
const dotenv = require("dotenv")
const env = dotenv.config().parsed;

// Console prompt
const prompt = require('prompt');

// Stream chat
const StreamChat = require('stream-chat').StreamChat; 
const streamServerClient = StreamChat.getInstance(env.STREAM_KEY, process.env.STREAM_SECRET);

/**
 * Send message thru a channel via the command line
 * 
 * @param {ChannelAPIResponse} channel 
 */
const send_messages = async (channel) => {
    prompt.message = "Enter";
    prompt.delimiter = " ";
    prompt.start();
    prompt.get(['message'], async function (err, result) {
        if (err) {
            return null;
        }
        if(result.message !== undefined && result.message !== null && channel !== undefined && channel !== null) {
            if(result.message === 'q') {
                await streamServerClient.disconnectUser();
                return;
            }
            else {
                await channel.sendMessage({text: result.message,});
            }
        }
        send_messages(channel);
    });
}

/**
 * Main routine.
 */
const main = async () => {
    // ID of this user
    const id = 'name2';

    // Id of other user
    const other_id = env.USER_EX.split("@").join("").split(".").join("");

    // Create a chat token and connect
    const chat_token = streamServerClient.createToken(id);
    await streamServerClient.connectUser({id: id,}, chat_token);

    // Get channel with this user and other user
    const channels = await streamServerClient.queryChannels({ type: 'messaging', members: { $eq: [id, other_id] } }, { last_message_at: -1 });
    console.log(channels.map((channel) => channel.state.members));

    // Send messages via console
    send_messages(channels[0]);
    
    // Listen for message 
    streamServerClient.on(event => { 
        if(event.message) {
            if(event.message.user.id !== id && event.message.cid === channels[0].cid) {
                console.log("\x1b[31mRecieved message: " + event.message.text + "\n" + "\x1b[30m");
            }
        }
    });
}

// Run
main();