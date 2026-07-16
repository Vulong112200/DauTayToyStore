import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AddressInput, type AddressView, addressInputSchema } from '@repo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AddressesService } from './addresses.service';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách địa chỉ đã lưu' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AddressView[]> {
    return this.addressesService.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm địa chỉ mới' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.addressesService.create(user.id, body);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
    @Body(new ZodValidationPipe(addressInputSchema)) body: AddressInput,
  ): Promise<AddressView> {
    return this.addressesService.update(user.id, addressId, body);
  }

  @Delete(':addressId')
  @ApiOperation({ summary: 'Xoá địa chỉ' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ): Promise<{ success: true }> {
    await this.addressesService.remove(user.id, addressId);
    return { success: true };
  }
}
