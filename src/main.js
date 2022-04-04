const { SecretNetworkClient } = require("secretjs");
let client;
let accAddress;

Number.prototype.countDecimals = function () {
    if(Math.floor(this.valueOf()) === this.valueOf()) return 0;
    return this.toString().split(".")[1].length || 0; 
}

const disableRecipientButton = () => {
    document.getElementById("recipient_submit_btn").innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="sr-only">Loading...</span></div>`
    document.getElementById("recipient_submit_btn").disabled = true
}

const enableRecipientButton = () => {
    document.getElementById("recipient_submit_btn").innerHTML = `Submit`
    document.getElementById("recipient_submit_btn").disabled = false
}

const disableAdminButton = () => {
    document.getElementById("admin_submit_btn").innerHTML = `<div class="spinner-border spinner-border-sm" role="status"><span class="sr-only">Loading...</span></div>`
    document.getElementById("admin_submit_btn").disabled = true
}

const enableAdminButton = () => {
    document.getElementById("admin_submit_btn").innerHTML = `Submit`
    document.getElementById("admin_submit_btn").disabled = false
}

const validateAddress = (address) => {
    if (address.length !== 45 && !address.startsWith("secret1") ){
        throw new Error("Invalid recipient address", address);
    }
    return true;
}

window.onload = async () => {
    //show contract address on page
    document.getElementById("contract_address").innerHTML = process.env.CONTRACT_ADDRESS;

    // Keplr injects the helper function to `window.keplr`.
    // If `window.getOfflineSignerOnlyAmino` or `window.keplr` is null, Keplr extension may be not installed or up to date on the browser.
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

    // Initialize the client with the offline signer from Keplr extension.
	client = await SecretNetworkClient.create({
        grpcWebUrl: process.env.GRPCWEB_URL,
        chainId: process.env.CHAIN_ID,
        wallet: offlineSigner,
        walletAddress: accAddress,
        encryptionUtils: enigmaUtils
      });

    document.getElementById("account_address").innerHTML = accAddress;
    enableRecipientButton();
    enableAdminButton();
};

//handle submitting the recipient change form
document.distForm.onsubmit = (e) => {
    e.preventDefault();

    //show loading spinner
    disableRecipientButton();

    //get the new receiving addresses from the form fields
    let recipients = []
    try {
        const recipient1 = document.distForm.recipient1.value.trim();
        const amount1 = document.distForm.amount1.value.trim();
        if(recipient1){
            recipients.push({
                address: recipient1,
                amount: amount1
            })
        }

        const recipient2 = document.distForm.recipient2.value.trim();
        const amount2 = document.distForm.amount2.value.trim();
        if(recipient2){
            recipients.push({
                address: recipient2,
                amount: amount2
            })
        }

        const recipient3 = document.distForm.recipient3.value.trim();
        const amount3 = document.distForm.amount3.value.trim();
        if(recipient3){
            recipients.push({
                address: recipient3,
                amount: amount3
            })
        }

        const recipient4 = document.distForm.recipient4.value.trim();
        const amount4 = document.distForm.amount4.value.trim();
        if(recipient4){
            recipients.push({
                address: recipient4,
                amount: amount4
            })
        }

        const recipient5 = document.distForm.recipient5.value.trim();
        const amount5 = document.distForm.amount5.value.trim();
        if(recipient5){
            recipients.push({
                address: recipient5,
                amount: amount5
            })
        }

        //show error if no recipients
        if (!recipients.length){
            throw new Error("You must enter at least one recipient!")
        }
    } catch (err) {
        enableRecipientButton();
        alert(`Error: ${err}`);
        return false;
    }

    (async() => {
    try{
        //if only one address was entered, send them 100%
        if (recipients.length === 1) {
            validateAddress(recipients[0].address)

            await window.keplr.enable(process.env.CHAIN_ID);

            //set dist info with 2 decimal places in rates
            //contract function to execute
            const handleMsg = {
                change_distribution : {
                    dist_info: {
                        decimal_places_in_rates: 2,
                        royalties: [
                            {
                                recipient: recipients[0].address,
                                rate: 100
                            }
                        ]
                    },
                }
            }

            //execute the contract function
            //Gas price does not need to be specified when using Keplr. Keplr will prompt the user to choose a gas price (Low/Average/High).
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

            //hide loading spinner
            enableRecipientButton();

            //check for TX errors
            if (tx.code !== undefined && tx.code !== 0) {
                console.log(tx)
                alert(`Failed to execute:\n${tx.transactionHash}\n` + tx.rawLog);
            } else {
                alert(`Receiving address successfully changed!\nTX Hash: ${tx.transactionHash}`);
            }

            return true;
        }

        //otherwise calculate rates
        let distInfo = [];

        recipients.forEach(({address, amount}, index) => {
            console.log(address, amount)
            if (isNaN(amount)){
                throw new Error(`'${amount}' is not a valid percentage.`)
            }
            validateAddress(address)
            const decimals = Number(amount).countDecimals()
            if (decimals > 3) {
                throw new Error(`Error: Percentages are limited to 3 decimal places.\n'${amount}' has ${decimals}.`)
            }

            // convert percentage into rate integers with 5 decimal places
            // eg 25.12% = 0.25120 = 25120
            const intAmount = amount * 10e2
            console.log(intAmount)
            distInfo.push({
                recipient: address,
                rate: intAmount
            })
        })

        await window.keplr.enable(process.env.CHAIN_ID);

        //set dist info with 2 decimal places in rates
        //contract function to execute
        const handleMsg = {
            change_distribution : {
                dist_info: {
                    decimal_places_in_rates: 5,
                    royalties: distInfo
                },
            }
        }

        //execute the contract function
        //Gas price does not need to be specified when using Keplr. Keplr will prompt the user to choose a gas price (Low/Average/High).
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

        //hide loading spinner
        enableRecipientButton();

        //check for TX errors
        if (tx.code !== undefined && tx.code !== 0) {
            console.log(tx)
            alert(`Failed to execute:\n${tx.transactionHash}\n` + tx.rawLog);
        } else {
            alert(`Receiving address successfully changed!\nTX Hash: ${tx.transactionHash}`);
        }

    } catch (err) {
        enableRecipientButton();
        alert(`Error: ${err}`);
        return false;
    }
    })();

    return false;
};

//handle submitting the recipient change form
document.adminForm.onsubmit = (e) => {
    e.preventDefault();

    //show loading spinner
    disableAdminButton();

    //get the new admin address from the form field
    const admin = document.adminForm.new_admin.value.trim()

    //check if address is invalid
    if (admin.length !== 45 && !admin.startsWith("secret1") ){
        alert("Invalid admin address");
        return false;
    }

    (async() => {
    try{
        await window.keplr.enable(process.env.CHAIN_ID);

        //contract function to execute
        const handleMsg = {
            change_admin: {
                admin_addr: admin,
            }
        }

        //execute the contract function
        //Gas price does not need to be specified when using Keplr. Keplr will prompt the user to choose a gas price (Low/Average/High).
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

        //hide loading spinner
        enableAdminButton();

        //check for TX errors
        if (tx.code !== undefined && tx.code !== 0) {
            console.log(tx)
            alert(`Failed to execute:\n${tx.transactionHash}\n` + tx.rawLog);
        } else {
            alert(`Receiving address successfully changed!\nTX Hash: ${tx.transactionHash}`);
        }

        return true;

    } catch (err) {
        enableAdminButton();
        alert(`Error: ${err}`);
        return false;
    }
    })();

    return false;
};