import React, { ComponentProps, FC, forwardRef } from 'react'
import { classNames } from '../utils/classNames'

interface IconButtonProps extends Omit<ComponentProps<'button'>, 'color' | 'ref'> {
    icon?: React.ReactNode
}

const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(({ className, icon, ...props }, ref) => {
    const theirProps = props as object;

    return (
        <button {...theirProps} type="button" className={classNames("-mx-2 py-1.5 justify-self-start text-primary-text hover:bg-darkblue-500 hover:text-white focus:outline-none inline-flex rounded-lg items-center", className)}>
            <div className='mx-2'>
                <div className="h-6 w-6">
                    {icon}
                </div>
            </div>

            <span className="sr-only">Icon description</span>
        </button>
    )
})

export default IconButton