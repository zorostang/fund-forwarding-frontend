const { SecretNetworkClient } = require("secretjs");
let client;
let accAddress;

const disableButton = () => {
    document.getElementById("submit_btn").innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="sr-only">Loading...</span></div>`
    document.getElementById("submit_btn").disabled = true
}

const enableButton = () => {
    document.getElementById("submit_btn").innerHTML = `Submit`
    document.getElementById("submit_btn").disabled = false
}


window.onload = async () => {
    //show contract address on page
    document.getElementById("contract_address").innerHTML = process.env.CONTRACT_ADDRESS;

    // Kaple injects the helper function to `window.keplr`.
    // If `window.getOfflineSigner` or `window.keplr` is null, Keplr extension may be not installed on the browser.
    if (!window.getOfflineSignerOnlyAmino || !window.keplr) {
        alert("Please install or update Keplr Wallet extension");
    }

    // You should request Keplr to enable the wallet.
    // This method will ask the user whether or not to allow access if they haven't visited this website.
    // Also, it will request user to unlock the wallet if the wallet is locked.
    // If you don't request enabling before usage, there is no guarantee that other methods will work.
    await window.keplr.enable(process.env.CHAIN_ID);

    // Keplr extension injects the offline signer and encryptionUtils that are compatible with secretJS.
    // You can get this offline signer from `window.getOfflineSignerOnlyAmino(chainId:string)` after load event.
    // You can get thie encryptionUtils from `window.getEnigmaUtils(chainId:string)` after load event.
    const offlineSigner = window.getOfflineSignerOnlyAmino(process.env.CHAIN_ID);
	const enigmaUtils = window.getEnigmaUtils(process.env.CHAIN_ID);

    // You can get the address/public keys by `getAccounts` method.
    // It can return the array of address/public key.
    // But, currently, Keplr extension manages only one address/public key pair.
    // XXX: This line is needed to set the sender address for SigningCosmWasmClient.
    const accounts = await offlineSigner.getAccounts();
    accAddress = accounts[0].address;

    //custom fees object allows us to define defaut gas amounts for executions with this client. If no gasLimit is specificed with the TX the default will be used
    //amount does not need to be specificed since we are using keplr, the user will select the gas fee and keplr will calculate the final amount
	const customFees = {
        exec: {
            //amount: [{ amount: "50000", denom: "uscrt" }],
            gas: "100000",
        }
    }

    // Initialize the client with the offline signer from Keplr extension.
	client = await SecretNetworkClient.create({
        grpcWebUrl: process.env.GRPCWEB_URL,
        chainId: process.env.CHAIN_ID,
        wallet: offlineSigner,
        walletAddress: accAddress,
        encryptionUtils: enigmaUtils,
        customFees: customFees
      });

    document.getElementById("account_address").innerHTML = accAddress;
    enableButton();
};

document.distForm.onsubmit = () => {
    console.log("submit")
    //get the new receiving address from the form field
    let recipient = document.distForm.recipient.value.trim();

    //check if address is invalid
    if (recipient.length !== 45 && !recipient.startsWith("secret1") ){
        alert("Invalid recipient address");
        return false;
    }

    (async () => {
        try {
            //show loading spinner
            disableButton();
            await window.keplr.enable(process.env.CHAIN_ID);

            //contract function to execute
            const handleMsg = {
                change_distribution : {
                    dist_info: {
                        decimal_places_in_rates: 2,
                        royalties: [
                            {
                                recipient: recipient,
                                rate: 100
                            }
                        ]
                    },
                }
            }

            //execute the contract function
            const tx = await client.tx.compute.executeContract(
                {
                  sender: accAddress,
                  contract: process.env.CONTRACT_ADDRESS,
                  msg: handleMsg
                },
                {
                  gasLimit: 35000,
                },
              );
            console.log(tx);

            enableButton();

            //check for TX errors
            if (tx.code !== undefined &&
                tx.code !== 0) {
                alert("Failed to execute: " + tx.log || tx.rawLog);
            } else {
                alert(`Receiving address successfully changed!\nTX Hash: ${tx.transactionHash}`);
            }

            

        } catch (err) {
            enableButton();
            alert(`Error: ${err}`);
        }
    })();

    return false;
};
