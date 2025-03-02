import { useFormikContext } from "formik";
import { ChangeEvent, FC, forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { AddressBookItem, SwapType, UserExchangesData } from "../../lib/layerSwapApiClient";
import NetworkSettings from "../../lib/NetworkSettings";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { classNames } from '../utils/classNames'
import { toast } from "react-hot-toast";
import { useSwapDataState, useSwapDataUpdate } from "../../context/swap";
import { Info } from "lucide-react";
import KnownInternalNames from "../../lib/knownIds";
import { useAuthState } from "../../context/authContext";
import ExchangeSettings from "../../lib/ExchangeSettings";
import { useSettingsState } from "../../context/settings";
import { isValidAddress } from "../../lib/addressValidator";
import { RadioGroup } from "@headlessui/react";
import Image from 'next/image';
import { Partner } from "../../Models/Partner";
import RainbowKit from "../Wizard/Steps/Wallet/RainbowKit";
import { useAccount } from "wagmi";
import { disconnect } from '@wagmi/core'
import { metaMaskWallet, rainbowWallet, imTokenWallet, argentWallet, walletConnectWallet, coinbaseWallet } from '@rainbow-me/rainbowkit/wallets';
import shortenAddress from "../utils/ShortenAddress";
import { isBlacklistedAddress } from "../../lib/mainStepValidator";
import { Wallet } from 'lucide-react'
import makeBlockie from 'ethereum-blockies-base64';

interface Input extends Omit<React.HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange'> {
    hideLabel?: boolean;
    disabled: boolean;
    name: string;
    children?: JSX.Element | JSX.Element[];
    ref?: any;
    loading: boolean;
    onSetExchangeDepoisteAddress?: () => Promise<void>;
    exchangeAccount?: UserExchangesData;
    close: () => void,
    isPartnerWallet: boolean,
    partnerImage: string,
    partner: Partner,
    canFocus?: boolean,
    address_book: AddressBookItem[]
}


const Address: FC<Input> = forwardRef<HTMLInputElement, Input>(
    ({ exchangeAccount, name, canFocus, onSetExchangeDepoisteAddress, loading, close, address_book, disabled, isPartnerWallet, partnerImage, partner }, ref) => {

        const {
            values,
            setFieldValue
        } = useFormikContext<SwapFormValues>();

        const inputReference = useRef(null);

        const valid_addresses = address_book?.filter(a => (values.swapType === SwapType.OffRamp ? a.exchanges?.some(e => values.to.baseObject.internal_name === e) : a.networks?.some(n => values.to.baseObject.internal_name === n)) && isValidAddress(a.address, values.to.baseObject))

        const { setDepositeAddressIsfromAccount, setAddressConfirmed } = useSwapDataUpdate()
        const { depositeAddressIsfromAccount, addressConfirmed } = useSwapDataState()
        const placeholder = NetworkSettings.KnownSettings[values?.to?.baseObject?.internal_name]?.AddressPlaceholder ?? "0x123...ab56c"
        const [inputFocused, setInputFocused] = useState(false)
        const [inputValue, setInputValue] = useState(values?.destination_address || "")
        const [validInputAddress, setValidInputAddress] = useState<string>()

        const { authData } = useAuthState()
        const settings = useSettingsState()
        const { isConnected, isDisconnected, connector } = useAccount({
            onConnect({ address }) {
                setInputValue(address)
                setAddressConfirmed(true)
                setFieldValue("destination_address", address)
            },
            onDisconnect() {
                setInputValue("")
                setAddressConfirmed(false)
                setFieldValue("destination_address", "")
            }
        });

        const exchangeCurrency = values?.swapType === SwapType.OffRamp && values.to?.baseObject?.currencies.find(ec => ec.asset === values.currency?.baseObject?.asset && ec.is_default)

        const handleUseDepositeAddress = async () => {
            try {
                await onSetExchangeDepoisteAddress()
            }
            catch (e) {
                toast(e.message)
            }
        }

        useEffect(() => {
            if (canFocus) {
                inputReference.current.focus()
            }
        }, [canFocus])

        useEffect(() => {
            setInputValue(values.destination_address)
        }, [values.destination_address])

        const handleRemoveDepositeAddress = useCallback(async () => {
            setDepositeAddressIsfromAccount(false)
            setFieldValue("destination_address", '')
            disconnect()
            setInputValue("")
        }, [depositeAddressIsfromAccount, isConnected, connector, isDisconnected])

        const handleSelectAddress = useCallback((value: string) => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", value)
            close()
        }, [close])

        const inputAddressIsValid = isValidAddress(inputValue, values.to.baseObject)

        let errorMessage = '';
        if (inputValue && !isValidAddress(inputValue, values.to.baseObject)) {
            errorMessage = `Enter a valid ${values.to.name} address`
        }
        else if (inputValue && values.swapType !== SwapType.OffRamp && isBlacklistedAddress(settings.blacklisted_addresses, values.to.baseObject, inputValue)) {
            errorMessage = `You can not transfer to this address`
        }

        const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
            setInputValue(e.target.value)
            setAddressConfirmed(false)
        }, [])

        useEffect(() => {
            if (inputAddressIsValid) {
                setValidInputAddress(inputValue)
            }
        }, [inputValue, inputAddressIsValid])

        const handleInputFocus = () => {
            setInputFocused(true)
        }
        const handleInputBlur = () => {
            setInputFocused(false)
        }

        const handleSetNewAddress = useCallback(() => {
            setAddressConfirmed(true)
            setFieldValue("destination_address", validInputAddress)
            close()
        }, [validInputAddress])

        const availableNetworks = values.swapType === SwapType.OffRamp && values.currency && values.to?.baseObject?.currencies?.filter(c => c.asset === values.currency.baseObject.asset && settings.networks.find(n => n.internal_name === c.network).status === 'active' && c.is_default).map(n => n.network)
        const destinationNetwork = values.swapType === SwapType.OffRamp && settings.networks.find(n => availableNetworks && availableNetworks.includes(n.internal_name))

        return (<>
            <div className='w-full flex flex-col justify-between h-full text-primary-text'>
                <div className='flex flex-col self-center grow w-full'>
                    <div className={`flex flex-col self-center grow w-full space-y-3`}>
                        <div className="text-left">
                            <label htmlFor={name}>Address</label>
                            {isPartnerWallet && partner && <span className='truncate text-sm text-indigo-200'> ({partner?.display_name})</span>}
                            <div className="flex flex-wrap flex-col md:flex-row">
                                <div className="relative flex grow rounded-lg shadow-sm mt-1.5 bg-darkblue-700 border-darkblue-500 border focus-within:ring-0 focus-within:ring-primary focus-within:border-primary">
                                    {isPartnerWallet &&
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            {
                                                partnerImage &&
                                                <Image alt="Partner logo" className='rounded-md object-contain' src={partnerImage} width="24" height="24"></Image>
                                            }
                                        </div>
                                    }
                                    <input
                                        onChange={handleInputChange}
                                        value={inputValue}
                                        placeholder={placeholder}
                                        onFocus={handleInputFocus}
                                        onBlur={handleInputBlur}
                                        autoCorrect="off"
                                        type={"text"}
                                        disabled={disabled || isConnected}
                                        name={name}
                                        id={name}
                                        ref={inputReference}
                                        tabIndex={0}
                                        className={`${isPartnerWallet ? 'pl-11' : ''} disabled:cursor-not-allowed grow h-12 border-none leading-4  block font-semibold w-full bg-darkblue-700 rounded-lg placeholder-primary-text truncate hover:overflow-x-scroll focus:ring-0 focus:outline-none`}
                                    />
                                    {
                                        inputValue &&
                                        <span className="inline-flex items-center mr-2">
                                            <div className="text-xs flex items-center space-x-2 md:ml-5 bg-darkblue-500 rounded-md border border-darkblue-500">
                                                {
                                                    values?.to?.baseObject?.internal_name?.toLowerCase() === KnownInternalNames.Exchanges.Coinbase &&
                                                    <span className="inline-flex items-center mr-2">
                                                        <div className="text-sm flex items-center space-x-2 ml-3 md:ml-5">
                                                            {exchangeAccount?.note}
                                                        </div>
                                                    </span>
                                                }
                                                {
                                                    !disabled &&
                                                    <button
                                                        type="button"
                                                        className="p-0.5 duration-200 transition  hover:bg-darkblue-400  rounded-md border border-darkblue-500 hover:border-darkblue-200"
                                                        onClick={handleRemoveDepositeAddress}
                                                    >
                                                        <div className="flex items-center px-2 text-sm py-1 font-semibold">
                                                            {
                                                                isConnected ? <>Disconnect</>
                                                                    : <>Clear</>
                                                            }
                                                        </div>
                                                    </button>
                                                }
                                            </div>
                                        </span>
                                    }
                                </div>
                                {errorMessage &&
                                    <div className="basis-full text-xs text-primary h-3">
                                        {errorMessage}
                                    </div>
                                }
                            </div>
                        </div>
                        {
                            validInputAddress &&
                            <div onClick={handleSetNewAddress} className={`text-left min-h-12 cursor-pointer space-x-2 border border-darkblue-300 bg-darkblue-600 shadow-xl flex text-sm rounded-md items-center w-full transform hover:bg-darkblue-500 transition duration-200 px-2 py-2 hover:border-darkblue-500 hover:shadow-xl`}>
                                <div className='flex text-primary-text bg-darkblue-400 flex-row items-left rounded-md p-2'>
                                    <Image src={makeBlockie(validInputAddress)}
                                        alt="Project Logo"
                                        height="20"
                                        width="20"
                                        className='rounded-sm'
                                    />
                                </div>
                                <div className="flex flex-col grow">
                                    <div className="block text-md font-medium text-white">
                                        {shortenAddress(validInputAddress)}
                                    </div>
                                </div>
                                <div className='flex text-primary-text flex-row items-left px-2 py-1 rounded-md'>
                                    Select
                                </div>
                            </div>
                        }
                        {
                            !disabled
                            && !inputValue
                            && values?.swapType === SwapType.OffRamp
                            && authData?.access_token && values.to
                            && ExchangeSettings.KnownSettings[values.to.baseObject.internal_name]?.EnableDepositAddressConnect
                            && !depositeAddressIsfromAccount &&
                            <div onClick={handleUseDepositeAddress} className={`text-left min-h-12 cursor-pointer space-x-2 border border-darkblue-500 bg-darkblue-700/70  flex text-sm rounded-md items-center w-full transform hover:bg-darkblue-700 transition duration-200 px-2 py-1.5 hover:border-darkblue-500 hover:shadow-xl`}>
                                <div className='flex text-primary-text flex-row items-left bg-darkblue-400 px-2 py-1 rounded-md'>
                                    <Wallet className="h-6 w-6 text-primary-text" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="block text-sm font-medium">
                                        Autofill from {values?.to?.baseObject?.display_name}
                                    </div>
                                    <div className="text-gray-500">
                                        Connect your account to fetch the address
                                    </div>
                                </div>
                            </div>
                        }
                        {
                            !disabled && !inputValue && values?.swapType !== SwapType.OffRamp && values.to?.baseObject?.address_type === 'evm' &&
                            <RainbowKit>
                                <div className={`min-h-12 text-left space-x-2 border border-darkblue-500 bg-darkblue-700/70  flex text-sm rounded-md items-center w-full transform transition duration-200 px-2 py-1.5 hover:border-darkblue-500 hover:bg-darkblue-700 hover:shadow-xl`}>
                                    <div className='flex text-primary-text flex-row items-left bg-darkblue-400 px-2 py-1 rounded-md'>
                                        <Wallet className="h-6 w-6 text-primary-text" />
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="block text-sm font-medium">
                                            Autofill from wallet
                                        </div>
                                        <div className="text-gray-500">
                                            Connect your wallet to fetch the address
                                        </div>
                                    </div>
                                </div>
                            </RainbowKit>
                        }
                        {
                            values.swapType === SwapType.OffRamp && !inputAddressIsValid &&
                            <div className='text-left p-4 bg-darkblue-800 text-white rounded-lg border border-darkblue-500'>
                                <div className="flex items-center">
                                    <Info className='h-5 w-5 text-primary-600 mr-3' />
                                    <label className="block text-sm md:text-base font-medium leading-6">How to find your {values.to.baseObject.display_name} deposit address</label>
                                </div>
                                <ul className="list-disc font-light space-y-1 text-xs md:text-sm mt-2 ml-8 text-primary-text">
                                    <li>Go to the Deposits page</li>
                                    <li>
                                        Select
                                        <span className="inline-block mx-1">
                                            <span className='flex gap-1 items-baseline text-sm '>
                                                <Image src={`${settings.discovery.resource_storage_url}/layerswap/currencies/${values.currency.name.toLowerCase()}.png`}
                                                    alt="Project Logo"
                                                    height="15"
                                                    width="15"
                                                    className='rounded-sm'
                                                />
                                                <span className="text-white">{values.currency.name}</span>
                                            </span>
                                        </span>
                                        as asset
                                    </li>
                                    <li>
                                        Select
                                        <span className="inline-block mx-1">
                                            <span className='flex gap-1 items-baseline text-sm '>
                                                <Image src={`${settings.discovery.resource_storage_url}/layerswap/networks/${destinationNetwork.internal_name.toLowerCase()}.png`}
                                                    alt="Project Logo"
                                                    height="15"
                                                    width="15"
                                                    className='rounded-sm'
                                                />
                                                <span className="text-white">{destinationNetwork.display_name}</span>
                                            </span>
                                        </span>
                                        as network
                                    </li>
                                </ul>
                            </div>
                        }
                        {
                            !disabled && valid_addresses?.length > 0 && !inputValue &&
                            <div className="text-left">
                                <label className="">Recently used</label>
                                <div>
                                    <RadioGroup disabled={disabled} value={values.destination_address} onChange={handleSelectAddress}>
                                        <div className="rounded-md overflow-y-auto styled-scroll">
                                            {valid_addresses?.map((a, index) => (
                                                <RadioGroup.Option
                                                    key={a.address}
                                                    value={a.address}
                                                    disabled={disabled}
                                                    className={({ checked, disabled }) =>
                                                        classNames(
                                                            disabled ? ' cursor-not-allowed ' : ' cursor-pointer ',
                                                            'relative flex focus:outline-none mt-2 mb-3  '
                                                        )
                                                    }
                                                >
                                                    {({ active, checked }) => {
                                                        const difference_in_days = Math.round(Math.abs(((new Date()).getTime() - new Date(a.date).getTime()) / (1000 * 3600 * 24)))
                                                        return (
                                                            <RadioGroup.Description
                                                                as="span"
                                                                className={`space-x-2 flex text-sm rounded-md items-center w-full transform hover:bg-darkblue-300 transition duration-200 px-2 py-1.5 border border-darkblue-900 hover:border-darkblue-500 hover:bg-darkblue-700/70 hover:shadow-xl ${checked && 'border-darkblue-700'}`}
                                                            >
                                                                <div className='flex bg-darkblue-500 text-primary-text flex-row items-left  rounded-md p-2'>
                                                                    <Image src={makeBlockie(a.address)}
                                                                        alt="Project Logo"
                                                                        height="20"
                                                                        width="20"
                                                                        className='rounded-sm'
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="block text-sm font-medium">
                                                                        {shortenAddress(a.address)}
                                                                    </div>
                                                                    <div className="text-gray-500">
                                                                        {
                                                                            difference_in_days === 0 ?
                                                                                <>Used today</>
                                                                                :
                                                                                (difference_in_days > 1 ?
                                                                                    <>Used {difference_in_days} days ago</>
                                                                                    : <>Used yesterday</>)
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </RadioGroup.Description>
                                                        )
                                                    }}
                                                </RadioGroup.Option>
                                            ))}
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </>
        )
    });

function GetIcon({ internal_name, resource_storage_url }) {
    return `${resource_storage_url}/layerswap/networks/${internal_name.toLowerCase()}.png`;
}

export default Address