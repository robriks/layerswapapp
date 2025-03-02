import { keccak256 } from "js-sha3";
import { CryptoNetwork } from "../Models/CryptoNetwork";
import { Exchange } from "../Models/Exchange";
import KnownInternalNames from "./knownIds";
import { validateAndParseAddress } from "./starkNetAddressValidator";
import { PublicKey } from '@solana/web3.js'

export function isValidAddress(address: string, network: CryptoNetwork | Exchange): boolean {
    if (network.internal_name === KnownInternalNames.Networks.RoninMainnet) {
        if (address.startsWith("ronin:")) {
            return isValidEtherAddress(address.replace("ronin:", "0x"));
        }
        return false;
    }
    else if (network.internal_name.toLowerCase().startsWith("ZKSYNC".toLowerCase())) {
        if (address?.startsWith("zksync:")) {
            return isValidEtherAddress(address.replace("zksync:", ""));
        }
        return isValidEtherAddress(address);
    }
    else if (network.internal_name.toLowerCase().startsWith("STARKNET".toLowerCase())) {
        return validateAndParseAddress(address);
    }
    else if (network.internal_name === KnownInternalNames.Networks.Osmosis) {
        if (/^(osmo1)?[a-z0-9]{38}$/.test(address)) {
            return true
        }
        return false
    }
    else if (network.internal_name === KnownInternalNames.Networks.SolanaMainnet || network.internal_name === KnownInternalNames.Networks.SolanaTestnet) {
        try {
            let pubkey = new PublicKey(address)
            let isSolana = PublicKey.isOnCurve(pubkey.toBuffer())
            return isSolana
        } catch (error) {
            return false
        }
    }
    else if (network.internal_name === KnownInternalNames.Networks.SorareStage) {
        if (/^(0x)?[0-9a-f]{64}$/.test(address) || /^(0x)?[0-9A-F]{64}$/.test(address) || /^(0x)?[0-9a-f]{66}$/.test(address) || /^(0x)?[0-9A-F]{66}$/.test(address)) {
            return true;
        }
        return false
    }
    else {
        return isValidEtherAddress(address);
    }
}

function isValidEtherAddress(address: string): boolean {
    if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
        // check if it has the basic requirements of an address
        return false;
    } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
        // If it's all small caps or all all caps, return true
        return true;
    } else {
        // Otherwise check each case
        return isChecksumAddress(address);
    }
}

function isChecksumAddress(address: string): boolean {
    // Check each case
    address = address.replace('0x', '');
    var addressHash = keccak256(address.toLowerCase());
    for (var i = 0; i < 40; i++) {
        // the nth letter should be uppercase if the nth digit of casemap is 1
        if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
            return false;
        }
    }
    return true;
};